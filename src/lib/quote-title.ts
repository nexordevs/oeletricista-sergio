export const DEFAULT_QUOTE_TITLE = "Orçamento de serviços elétricos";
/** Descrição do serviço só quando o eletricista escreveu algo (o título padrão não diz nada ao cliente). */
export function quoteSubject(title: string | null | undefined): string | null {
  const t = (title ?? "").trim();
  return t && t.toLowerCase() !== DEFAULT_QUOTE_TITLE.toLowerCase() ? t : null;
}
/** Preço de venda do material = custo + margem (%). */
export const withMarkup = (cost: number, pct: number) => Math.round(cost * (1 + (pct || 0) / 100) * 100) / 100;

export const NO_MATERIAL = "Sem material incluso";
/** O orçamento sempre tem duas partes: Serviços (serviços + mão de obra) e Material (ou "Sem material incluso"). */
export function quoteSections<T extends { kind: string; position?: number }>(items: T[]) {
  const sorted = [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return [
    { k: "SERVICE" as const, title: "Serviços", subtotalLabel: "Subtotal serviços", items: sorted.filter((i) => i.kind !== "MATERIAL") },
    { k: "MATERIAL" as const, title: "Material", subtotalLabel: "Subtotal material", items: sorted.filter((i) => i.kind === "MATERIAL") },
  ];
}
