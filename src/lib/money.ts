export type Num = number | string | { toString(): string } | null | undefined;
export const toNum = (v: Num) => (v == null ? 0 : Number(v.toString()));
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const brl = (v: Num) =>
  toNum(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" }) : "—";
export const onlyDigits = (s: string) => s.replace(/\D/g, "");
export const waLink = (phone: string, text?: string) => {
  let d = onlyDigits(phone);
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};
export const fmtPhone = (p?: string | null) => {
  const d = onlyDigits(p || "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p || "";
};
