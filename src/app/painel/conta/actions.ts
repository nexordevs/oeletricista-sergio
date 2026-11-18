"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";
import { parseForm, zText, type ActionState } from "@/lib/form";
import { cookies } from "next/headers";
import { sha256 } from "@/lib/crypto";

export async function saveAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = parseForm(z.object({ name: zText(2, 80, "Informe seu nome"), current: z.string().optional(), password: z.string().optional() }), fd);
  if (!p.ok) return p.error;
  const { name, current, password } = p.data;
  const data: { name: string; passwordHash?: string } = { name };
  if (password) {
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) return { error: "Confira os campos.", fields: { password: "Mínimo 8 caracteres, com letras e números" } };
    if (!current || !(await verifyPassword(current, user.passwordHash))) return { error: "Confira os campos.", fields: { current: "Senha atual incorreta" } };
    data.passwordHash = await hashPassword(password);
    const sid = (await cookies()).get("sid")?.value;
    await prisma.session.deleteMany({ where: { userId: user.id, NOT: { id: sid ? sha256(sid) : "" } } }); // encerra outras sessões
  }
  await prisma.user.update({ where: { id: user.id }, data });
  revalidatePath("/painel");
  return { ok: true, message: password ? "Dados e senha atualizados." : "Dados atualizados." };
}
