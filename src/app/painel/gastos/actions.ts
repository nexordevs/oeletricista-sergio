"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertFeature } from "@/lib/access";
import { parseForm, zText, zMoney, zOpt, type ActionState } from "@/lib/form";

const refresh = () => { revalidatePath("/painel/gastos"); revalidatePath("/painel/financeiro"); };

export async function saveCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertFeature(user, "finance");
  const p = parseForm(z.object({ id: z.string().optional(), name: zText(2, 60, "Dê um nome"), planned: zMoney, group: z.enum(["ESSENCIAL", "DESEJO", "RESERVA"]) }), fd);
  if (!p.ok) return p.error;
  const { id, ...d } = p.data;
  if (id) {
    const r = await prisma.budgetCategory.updateMany({ where: { id, userId: user.id }, data: d });
    if (!r.count) return { error: "Categoria não encontrada." };
  } else {
    const last = await prisma.budgetCategory.aggregate({ where: { userId: user.id }, _max: { sortOrder: true } });
    await prisma.budgetCategory.create({ data: { ...d, userId: user.id, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  }
  refresh();
  return { ok: true, message: id ? "Salvo" : "Categoria criada!" };
}

export async function deleteCategory(fd: FormData) {
  const user = await requireUser();
  await assertFeature(user, "finance");
  // os gastos lançados continuam no financeiro, só ficam sem categoria
  await prisma.budgetCategory.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  refresh();
}

export async function addExpense(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertFeature(user, "finance");
  const p = parseForm(z.object({ categoryId: z.string().min(1, "Escolha a categoria"), amount: zMoney, description: zOpt(150), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida") }), fd);
  if (!p.ok) return p.error;
  const { categoryId, amount, description, date } = p.data;
  if (amount <= 0) return { error: "Confira os campos.", fields: { amount: "Informe um valor maior que zero" } };
  const cat = await prisma.budgetCategory.findFirst({ where: { id: categoryId, userId: user.id } });
  if (!cat) return { error: "Confira os campos.", fields: { categoryId: "Categoria não encontrada" } };
  await prisma.financeEntry.create({ data: { userId: user.id, type: "EXPENSE", amount, categoryId: cat.id, description: description || cat.name, date: new Date(date + "T12:00:00-03:00") } });
  refresh();
  return { ok: true, message: `Gasto de R$ ${amount.toFixed(2).replace(".", ",")} lançado em ${cat.name}.` };
}
