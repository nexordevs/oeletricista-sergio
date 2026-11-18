import { z } from "zod";
export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string>; message?: string; data?: Record<string, string> } | undefined;
export type Parsed<T> = { ok: true; data: T } | { ok: false; error: NonNullable<ActionState> };
export function parseForm<T extends z.ZodTypeAny>(schema: T, fd: FormData): Parsed<z.infer<T>> {
  const raw: Record<string, unknown> = {};
  fd.forEach((v, k) => { if (typeof v === "string") raw[k] = v.trim(); });
  const r = schema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  const fields: Record<string, string> = {};
  for (const i of r.error.issues) fields[String(i.path[0])] ??= i.message;
  return { ok: false, error: { error: "Confira os campos destacados.", fields } };
}
export const zText = (min = 1, max = 200, msg = "Campo obrigatório") => z.string().min(min, msg).max(max, `Máximo de ${max} caracteres`);
export const zOpt = (max = 300) => z.string().max(max).optional().transform((v) => (v ? v : null));
export const zPhone = z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length >= 10 && v.length <= 13, "Telefone inválido (inclua o DDD)");
export const zMoney = z.string().transform((v) => Number(v.replace(/\s|R\$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."))).refine((n) => Number.isFinite(n) && n >= 0 && n < 1e8, "Valor inválido");
