"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, destroySession, clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import { env } from "@/lib/env";
import { provisionServices } from "@/lib/provision";
import { parseForm, zText, type ActionState } from "@/lib/form";

const zEmail = z.string().email("E-mail inválido").max(160).transform((v) => v.toLowerCase());
const zPass = z.string().min(8, "Use pelo menos 8 caracteres").max(100).refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Use letras e números");
const safeNext = (n: string | undefined | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

const signupSchema = z.object({
  name: zText(2, 80, "Informe seu nome"),
  email: zEmail,
  password: zPass,
  terms: z.literal("on", { errorMap: () => ({ message: "Aceite os termos para continuar" }) }),
  plano: z.string().max(40).optional(),
});

export async function signup(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!rateLimit(`signup:${clientIp()}`, 10, 3600e3)) return { error: "Muitas tentativas. Aguarde um pouco." };
  const p = parseForm(signupSchema, fd);
  if (!p.ok) return p.error;
  const { name, email, password, plano } = p.data;
  if (await prisma.user.findUnique({ where: { email } })) return { error: "Já existe uma conta com este e-mail.", fields: { email: "E-mail já cadastrado — use “Entrar”." } };
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), brand: { create: { professionalName: name, email } } },
  });
  await provisionServices(user.id);
  await createSession(user.id);
  redirect(plano ? `/painel/assinatura?plano=${encodeURIComponent(plano)}` : "/painel");
}

const loginSchema = z.object({ email: zEmail, password: z.string().min(1, "Informe a senha").max(100), next: z.string().optional() });

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = parseForm(loginSchema, fd);
  if (!p.ok) return p.error;
  const { email, password, next } = p.data;
  if (!rateLimit(`login:${clientIp()}`, 20, 900e3) || !rateLimit(`login:${email}`, 10, 900e3)) return { error: "Muitas tentativas. Aguarde 15 minutos." };
  const user = await prisma.user.findUnique({ where: { email } });
  const generic = { error: "E-mail ou senha incorretos." };
  if (!user) { await hashPassword("x"); return generic; } // tempo constante aproximado
  if (user.lockedUntil && user.lockedUntil > new Date()) return { error: "Conta temporariamente bloqueada por excesso de tentativas. Tente em 15 minutos ou redefina a senha." };
  if (!(await verifyPassword(password, user.passwordHash))) {
    const fails = user.failedLogins + 1;
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: fails >= 5 ? 0 : fails, lockedUntil: fails >= 5 ? new Date(Date.now() + 15 * 60e3) : null } });
    return generic;
  }
  if (user.blocked) return { error: "Sua conta está bloqueada. Fale com o suporte." };
  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  await createSession(user.id);
  redirect(safeNext(next) || (user.role === "ADMIN" ? "/admin" : "/painel"));
}

export async function logout() {
  await destroySession();
  redirect("/entrar");
}

export async function requestReset(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = parseForm(z.object({ email: zEmail }), fd);
  if (!p.ok) return p.error;
  const ok = { ok: true, message: "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha. Confira também a caixa de spam." };
  if (!rateLimit(`reset:${clientIp()}`, 5, 3600e3)) return ok;
  const user = await prisma.user.findUnique({ where: { email: p.data.email } });
  if (!user || user.blocked) return ok;
  const token = randomToken();
  await prisma.passwordResetToken.create({ data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3600e3) } });
  const link = `${env.appUrl}/redefinir-senha/${token}`;
  await sendMail(user.email, "Criar nova senha", `<p>Olá, ${user.name}!</p><p>Para criar uma nova senha, acesse o link abaixo (válido por 1 hora):</p><p><a href="${link}">${link}</a></p><p>Se você não pediu, ignore este e-mail.</p>`);
  return ok;
}

export async function resetPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = parseForm(z.object({ token: z.string().min(10).max(200), password: zPass, confirm: z.string() }).refine((d) => d.password === d.confirm, { message: "As senhas não conferem", path: ["confirm"] }), fd);
  if (!p.ok) return p.error;
  const t = await prisma.passwordResetToken.findUnique({ where: { id: sha256(p.data.token) } });
  if (!t || t.usedAt || t.expiresAt < new Date()) return { error: "Link inválido ou expirado. Peça um novo." };
  await prisma.$transaction([
    prisma.user.update({ where: { id: t.userId }, data: { passwordHash: await hashPassword(p.data.password), failedLogins: 0, lockedUntil: null } }),
    prisma.passwordResetToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: t.userId } }),
  ]);
  return { ok: true, message: "Senha alterada! Agora é só entrar." };
}
