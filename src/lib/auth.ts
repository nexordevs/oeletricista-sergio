import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { randomToken, sha256 } from "./crypto";
import { env } from "./env";
import type { User } from "@prisma/client";

const COOKIE = "sid";
const SESSION_DAYS = 30;

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await prisma.session.create({
    data: { id: sha256(token), userId, expiresAt, userAgent: (await headers()).get("user-agent")?.slice(0, 200) },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", expires: expiresAt,
  });
}

export async function destroySession() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (t) await prisma.session.deleteMany({ where: { id: sha256(t) } });
  (await cookies()).delete(COOKIE);
}

export async function getUser(): Promise<User | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const s = await prisma.session.findUnique({ where: { id: sha256(t) }, include: { user: true } });
  if (!s || s.expiresAt < new Date() || s.user.blocked) return null;
  return s.user;
}

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/entrar");
  return u;
}

/** Área do administrador: qualquer outra pessoa é levada para a página inicial. */
export async function requireAdmin() {
  const u = await getUser();
  if (!u || u.role !== "ADMIN") redirect("/");
  return u;
}

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}
