import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;
type Q = { id: string; number: number; clientName: string; helperName: string | null; helperAmount: Prisma.Decimal | number; materialCost: Prisma.Decimal | number };
const num = (q: Q) => String(q.number).padStart(3, "0");

/**
 * Mantém no financeiro as SAÍDAS automáticas da divisão do valor (ajudante e material) de um orçamento aprovado.
 * Só mexe nos lançamentos automáticos desse orçamento; os manuais nunca são alterados.
 */
export async function syncSplit(tx: Tx, userId: string, q: Q, date: Date) {
  await tx.financeEntry.deleteMany({ where: { userId, quoteId: q.id, auto: true, autoKind: { in: ["ajudante", "material"] } } });
  const rows: { kind: string; amount: number; description: string }[] = [];
  const helper = Number(q.helperAmount), mat = Number(q.materialCost);
  if (helper > 0) rows.push({ kind: "ajudante", amount: helper, description: `Ajudante${q.helperName ? ` (${q.helperName})` : ""} – Orçamento nº ${num(q)}` });
  if (mat > 0) rows.push({ kind: "material", amount: mat, description: `Material – Orçamento nº ${num(q)} – ${q.clientName}` });
  for (const r of rows)
    await tx.financeEntry.create({ data: { userId, quoteId: q.id, auto: true, autoKind: r.kind, type: "EXPENSE", amount: r.amount, date, description: r.description.slice(0, 150) } });
}

/** Quanto ficou para o eletricista. */
export const ownShare = (total: number, helper: number, material: number) => Math.round((total - helper - material) * 100) / 100;
