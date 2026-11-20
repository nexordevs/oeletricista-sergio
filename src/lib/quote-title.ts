export const DEFAULT_QUOTE_TITLE = "Orçamento de serviços elétricos";
/** Descrição do serviço só quando o eletricista escreveu algo (o título padrão não diz nada ao cliente). */
export function quoteSubject(title: string | null | undefined): string | null {
  const t = (title ?? "").trim();
  return t && t.toLowerCase() !== DEFAULT_QUOTE_TITLE.toLowerCase() ? t : null;
}
/** Preço de venda do material = custo + margem (%). */
export const withMarkup = (cost: number, pct: number) => Math.round(cost * (1 + (pct || 0) / 100) * 100) / 100;
