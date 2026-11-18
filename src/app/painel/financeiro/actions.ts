"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertFeature } from "@/lib/access";
import { parseForm, zText, zMoney, type ActionState } from "@/lib/form";

export async function addEntry(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertFeature(user, "finance");
  const p = parseForm(z.object({ type: z.enum(["INCOME", "EXPENSE"]), description: zText(2, 150, "Descreva o lançamento"), amount: zMoney, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"), quoteId: z.string().optional() }), fd);
  if (!p.ok) return p.error;
  const { quoteId, date, ...d } = p.data;
  if (d.amount <= 0) return { error: "Confira os campos.", fields: { amount: "Informe um valor maior que zero" } };
  let qid: string | null = null;
  if (quoteId) { const q = await prisma.quote.findFirst({ where: { id: quoteId, userId: user.id }, select: { id: true } }); qid = q?.id ?? null; }
  await prisma.financeEntry.create({ data: { ...d, date: new Date(date + "T12:00:00-03:00"), quoteId: qid, userId: user.id } });
  revalidatePath("/painel/financeiro");
  return { ok: true, message: "Lançamento registrado." };
}

export async function deleteEntry(fd: FormData) {
  const user = await requireUser();
  await assertFeature(user, "finance");
  await prisma.financeEntry.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  revalidatePath("/painel/financeiro");
}
