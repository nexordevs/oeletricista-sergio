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

// ── Contas fixas ─────────────────────────────────────────────────────
const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const atNoon = (d: string) => new Date(d + "T12:00:00-03:00");

export async function saveBill(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertFeature(user, "finance");
  const p = parseForm(z.object({ id: z.string().optional(), name: zText(2, 60, "Dê um nome"), amount: zMoney, dueDay: z.coerce.number().int().min(1, "Dia de 1 a 31").max(31, "Dia de 1 a 31"), categoryId: z.string().optional() }), fd);
  if (!p.ok) return p.error;
  const { id, categoryId, ...d } = p.data;
  if (d.amount <= 0) return { error: "Confira os campos.", fields: { amount: "Informe o valor" } };
  const cat = categoryId ? await prisma.budgetCategory.findFirst({ where: { id: categoryId, userId: user.id }, select: { id: true } }) : null;
  const data = { ...d, categoryId: cat?.id ?? null };
  if (id) {
    const r = await prisma.recurringBill.updateMany({ where: { id, userId: user.id }, data });
    if (!r.count) return { error: "Conta não encontrada." };
  } else await prisma.recurringBill.create({ data: { ...data, userId: user.id } });
  refresh();
  return { ok: true, message: id ? "Salvo" : "Conta fixa criada! Ela aparece todo mês." };
}

export async function deleteBill(fd: FormData) {
  const user = await requireUser();
  await assertFeature(user, "finance");
  await prisma.recurringBill.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } }); // pagamentos ficam no financeiro
  refresh();
}

export async function payBill(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertFeature(user, "finance");
  const p = parseForm(z.object({ id: z.string().min(1), amount: zMoney, date: zDate }), fd);
  if (!p.ok) return p.error;
  const bill = await prisma.recurringBill.findFirst({ where: { id: p.data.id, userId: user.id } });
  if (!bill) return { error: "Conta não encontrada." };
  if (p.data.amount <= 0) return { error: "Confira o valor.", fields: { amount: "Informe o valor pago" } };
  const when = atNoon(p.data.date);
  const start = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), 1, 3)), end = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth() + 1, 1, 3));
  if (await prisma.financeEntry.count({ where: { userId: user.id, recurringId: bill.id, date: { gte: start, lt: end } } })) return { error: "Essa conta já está paga neste mês." };
  await prisma.financeEntry.create({ data: { userId: user.id, type: "EXPENSE", amount: p.data.amount, date: when, description: bill.name, categoryId: bill.categoryId, recurringId: bill.id } });
  refresh();
  return { ok: true, message: `${bill.name} paga ✓` };
}

// ── Metas ────────────────────────────────────────────────────────────
export async function saveGoal(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertFeature(user, "finance");
  const p = parseForm(z.object({ id: z.string().optional(), name: zText(2, 60, "Dê um nome à meta"), target: zMoney, deadline: z.string().optional() }), fd);
  if (!p.ok) return p.error;
  const { id, deadline, ...d } = p.data;
  if (d.target <= 0) return { error: "Confira os campos.", fields: { target: "Quanto você quer juntar?" } };
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return { error: "Confira os campos.", fields: { deadline: "Data inválida" } };
  const data = { ...d, deadline: deadline ? atNoon(deadline) : null };
  if (id) {
    const r = await prisma.savingsGoal.updateMany({ where: { id, userId: user.id }, data });
    if (!r.count) return { error: "Meta não encontrada." };
  } else await prisma.savingsGoal.create({ data: { ...data, userId: user.id } });
  refresh();
  return { ok: true, message: id ? "Meta salva" : "Meta criada! Agora é só ir guardando." };
}

export async function deleteGoal(fd: FormData) {
  const user = await requireUser();
  await assertFeature(user, "finance");
  const id = String(fd.get("id"));
  // apagar a meta devolve o dinheiro ao caixa: remove os depósitos dela
  await prisma.$transaction([
    prisma.financeEntry.deleteMany({ where: { userId: user.id, goalId: id } }),
    prisma.savingsGoal.deleteMany({ where: { id, userId: user.id } }),
  ]);
  refresh();
}

export async function depositGoal(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertFeature(user, "finance");
  const p = parseForm(z.object({ id: z.string().min(1), amount: zMoney, date: zDate }), fd);
  if (!p.ok) return p.error;
  const goal = await prisma.savingsGoal.findFirst({ where: { id: p.data.id, userId: user.id } });
  if (!goal) return { error: "Meta não encontrada." };
  if (p.data.amount <= 0) return { error: "Confira o valor.", fields: { amount: "Quanto você guardou?" } };
  await prisma.financeEntry.create({ data: { userId: user.id, type: "EXPENSE", amount: p.data.amount, date: atNoon(p.data.date), description: `Guardado para a meta: ${goal.name}`.slice(0, 150), goalId: goal.id } });
  refresh();
  return { ok: true, message: `Guardou R$ ${p.data.amount.toFixed(2).replace(".", ",")} para ${goal.name} 💪` };
}
