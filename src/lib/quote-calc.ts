import { round2 } from "./money";
export type CalcItem = { quantity: number; unitPrice: number };
export type CalcInput = { items: CalcItem[]; travelFee: number; discountType: "VALUE" | "PERCENT"; discountValue: number };
/** Cálculo único usado no servidor (fonte da verdade) e na tela (pré-visualização). */
export function calcQuote(i: CalcInput) {
  const lines = i.items.map((it) => round2(Math.max(0, it.quantity) * Math.max(0, it.unitPrice)));
  const itemsTotal = round2(lines.reduce((a, b) => a + b, 0));
  const subtotal = round2(itemsTotal + Math.max(0, i.travelFee));
  let discount = i.discountType === "PERCENT"
    ? round2(subtotal * Math.min(100, Math.max(0, i.discountValue)) / 100)
    : round2(Math.max(0, i.discountValue));
  if (discount > subtotal) discount = subtotal;
  return { lines, itemsTotal, subtotal, discount, total: round2(subtotal - discount) };
}
