"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAccess, canCreateQuote, hasFeature } from "@/lib/access";
import { calcQuote } from "@/lib/quote-calc";
import type { QuoteStatus } from "@prisma/client";

const num = (max: number) => z.coerce.number().finite().min(0).max(max);
const itemSchema = z.object({
  kind: z.enum(["SERVICE", "MATERIAL", "LABOR"]),
  description: z.string().trim().min(1, "Descreva todos os itens").max(200),
  unit: z.string().trim().min(1).max(20).default("un"),
  quantity: num(100000).refine((n) => n > 0, "Quantidade deve ser maior que zero"),
  unitPrice: num(10_000_000),
});
const quoteSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().optional().nullable(),
  clientName: z.string().trim().min(2, "Informe o cliente").max(120),
  clientPhone: z.string().trim().max(20).optional().nullable(),
  clientAddress: z.string().trim().max(250).optional().nullable(),
  saveClient: z.boolean().optional(),
  title: z.string().trim().min(2).max(150),
  items: z.array(itemSchema).min(1, "Adicione pelo menos um item").max(150),
  travelFee: num(1_000_000),
  discountType: z.enum(["VALUE", "PERCENT"]),
  discountValue: num(10_000_000),
  paymentTerms: z.string().trim().max(300).optional().nullable(),
  executionTime: z.string().trim().max(120).optional().nullable(),
  validityDays: z.coerce.number().int().min(1).max(180),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type QuotePayload = z.input<typeof quoteSchema>;
type Result = { ok: true; id: string } | { ok: false; error: string };

export async function saveQuote(payload: QuotePayload, intent: "draft" | "finalize"): Promise<Result> {
  const user = await requireUser();
  const r = quoteSchema.safeParse(payload);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message || "Dados inválidos" };
  const d = r.data;
  const access = await getAccess(user);
  if (!access.active) return { ok: false, error: "Sua assinatura não está ativa. Assine um plano para salvar orçamentos." };

  // Cálculo SEMPRE no servidor — o total enviado pela tela é ignorado.
  const c = calcQuote({ items: d.items, travelFee: d.travelFee, discountType: d.discountType, discountValue: d.discountValue });

  // Cliente: precisa pertencer ao usuário; ou cria um novo rapidamente
  let clientId: string | null = null;
  if (d.clientId) {
    const cl = await prisma.client.findFirst({ where: { id: d.clientId, userId: user.id }, select: { id: true } });
    if (!cl) return { ok: false, error: "Cliente inválido." };
    clientId = cl.id;
  } else if (d.saveClient) {
    clientId = (await prisma.client.create({ data: { userId: user.id, name: d.clientName, phone: d.clientPhone || null, address: d.clientAddress || null } })).id;
  }

  const discountStored = d.discountType === "PERCENT" ? Math.min(100, d.discountValue) : c.discount;
  const base = {
    clientId, clientName: d.clientName, clientPhone: d.clientPhone || null, clientAddress: d.clientAddress || null, title: d.title,
    travelFee: d.travelFee, discountType: d.discountType, discountValue: discountStored, subtotal: c.subtotal, total: c.total,
    paymentTerms: d.paymentTerms || null, executionTime: d.executionTime || null, validityDays: d.validityDays, notes: d.notes || null,
  };
  const items = d.items.map((it, i) => ({ ...it, total: c.lines[i], position: i }));

  let id = d.id;
  if (id) {
    const q = await prisma.quote.findFirst({ where: { id, userId: user.id }, select: { status: true } });
    if (!q) return { ok: false, error: "Orçamento não encontrado." };
    if (q.status === "APPROVED" || q.status === "REJECTED") return { ok: false, error: "Orçamento já decidido. Duplique para criar uma nova versão." };
    const finalize = intent === "finalize" && q.status === "DRAFT";
    await prisma.$transaction([
      prisma.quoteItem.deleteMany({ where: { quoteId: id } }),
      prisma.quote.update({ where: { id }, data: { ...base, ...(finalize ? { status: "SENT", issuedAt: new Date() } : q.status === "EXPIRED" ? { status: "SENT", issuedAt: new Date() } : {}), items: { create: items } } }),
    ]);
  } else {
    if (!canCreateQuote(access)) return { ok: false, error: `Você atingiu o limite de ${access.quoteLimit} orçamentos do seu plano este mês. Faça upgrade para continuar.` };
    id = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id: user.id }, data: { quoteCounter: { increment: 1 } }, select: { quoteCounter: true } });
      const q = await tx.quote.create({ data: { ...base, userId: user.id, number: u.quoteCounter, ...(intent === "finalize" ? { status: "SENT", issuedAt: new Date() } : {}), items: { create: items } } });
      return q.id;
    });
  }
  revalidatePath("/painel/orcamentos");
  revalidatePath("/painel");
  return { ok: true, id: id! };
}

async function owned(id: string, userId: string) {
  const q = await prisma.quote.findFirst({ where: { id, userId }, include: { items: true } });
  if (!q) throw new Error("Orçamento não encontrado.");
  return q;
}

export async function duplicateQuote(fd: FormData) {
  const user = await requireUser();
  const access = await getAccess(user);
  if (!canCreateQuote(access)) redirect("/painel/assinatura?limite=1");
  const q = await owned(String(fd.get("id")), user.id);
  const newId = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id: user.id }, data: { quoteCounter: { increment: 1 } }, select: { quoteCounter: true } });
    const { id: _i, number: _n, shareToken: _s, status: _st, issuedAt: _a, sentAt: _b, viewedAt: _c, decidedAt: _d, createdAt: _e, updatedAt: _f, items, ...rest } = q;
    const n = await tx.quote.create({ data: { ...rest, number: u.quoteCounter, items: { create: items.map(({ id: _x, quoteId: _y, ...it }) => it) } } });
    return n.id;
  });
  revalidatePath("/painel/orcamentos");
  redirect(`/painel/orcamentos/${newId}/editar`);
}

export async function deleteQuote(fd: FormData) {
  const user = await requireUser();
  await prisma.quote.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  revalidatePath("/painel/orcamentos");
  redirect("/painel/orcamentos");
}

const allowed: QuoteStatus[] = ["SENT", "APPROVED", "REJECTED"];
export async function setStatus(fd: FormData) {
  const user = await requireUser();
  const status = String(fd.get("status")) as QuoteStatus;
  const id = String(fd.get("id"));
  if (!allowed.includes(status)) throw new Error("Status inválido");
  if (!hasFeature(await getAccess(user), "status")) redirect("/painel/assinatura");
  const q = await owned(id, user.id);
  if (q.status === "DRAFT") throw new Error("Finalize o orçamento antes.");
  await prisma.quote.update({ where: { id }, data: { status, decidedAt: status === "SENT" ? null : new Date(), ...(status === "SENT" ? { issuedAt: new Date() } : {}) } });
  revalidatePath(`/painel/orcamentos/${id}`);
}

/** Registra que o orçamento foi compartilhado (ex.: WhatsApp). */
export async function markShared(id: string) {
  const user = await requireUser();
  const q = await owned(id, user.id);
  if (q.status === "DRAFT") return;
  await prisma.quote.update({ where: { id }, data: { sentAt: new Date() } });
}
