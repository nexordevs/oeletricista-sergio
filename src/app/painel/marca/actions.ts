"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAccess, hasFeature } from "@/lib/access";
import { processImage, ImageError } from "@/lib/images";
import { parseForm, zText, zOpt, type ActionState } from "@/lib/form";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").optional();
const schema = z.object({
  professionalName: zText(2, 80, "Informe seu nome profissional"),
  companyName: zOpt(100), document: zOpt(20), phone: zOpt(20), whatsapp: zOpt(20), address: zOpt(200), email: zOpt(160), tagline: zOpt(120),
  primaryColor: color, accentColor: color,
  defaultPaymentTerms: zOpt(300), defaultExecution: zOpt(120), defaultNotes: zOpt(1000),
  defaultValidityDays: z.coerce.number().int().min(1, "Mínimo 1 dia").max(180, "Máximo 180 dias"),
  autoRejectDays: z.coerce.number().int().min(1, "Mínimo 1 dia").max(90, "Máximo 90 dias"),
});

export async function saveBrand(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = parseForm(schema, fd);
  if (!p.ok) return p.error;
  const d = p.data;
  if (d.email && !z.string().email().safeParse(d.email).success) return { error: "Confira os campos.", fields: { email: "E-mail inválido" } };
  if (d.document) {
    const n = d.document.replace(/\D/g, "");
    if (n.length !== 11 && n.length !== 14) return { error: "Confira os campos.", fields: { document: "CPF (11 dígitos) ou CNPJ (14 dígitos)" } };
  }
  const full = hasFeature(await getAccess(user), "brandFull");
  const data: Record<string, unknown> = { ...d };
  if (!full) { delete data.primaryColor; delete data.accentColor; }
  try {
    const logo = fd.get("logo");
    if (logo instanceof File && logo.size > 0) { const img = await processImage(logo, { maxW: 600, format: "png" }); data.logo = img.data; data.logoMime = img.mime; }
    if (fd.get("removeLogo") === "on") { data.logo = null; data.logoMime = null; }
    const sig = fd.get("signature");
    if (full && sig instanceof File && sig.size > 0) { const img = await processImage(sig, { maxW: 600, maxH: 200, format: "png" }); data.signature = img.data; data.signatureMime = img.mime; }
    if (fd.get("removeSignature") === "on") { data.signature = null; data.signatureMime = null; }
  } catch (e) {
    if (e instanceof ImageError) return { error: e.message };
    throw e;
  }
  await prisma.brand.upsert({ where: { userId: user.id }, update: data, create: { ...(data as { professionalName: string }), userId: user.id } });
  revalidatePath("/painel/marca");
  return { ok: true, message: "Marca salva! Ela já aparece nos próximos PDFs." };
}
