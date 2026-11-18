"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { processImage, ImageError } from "@/lib/images";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { syncSubscription, syncOpenSubscriptions, activateManually } from "@/lib/mercadopago";
import { parseForm, zText, zOpt, zMoney, type ActionState } from "@/lib/form";

const audit = (actorId: string, action: string, target?: string, details?: string) => prisma.auditLog.create({ data: { actorId, action, target, details } });
const bool = (fd: FormData, k: string) => fd.get(k) === "on";

// ---------- Usuários ----------
export async function toggleBlock(fd: FormData) {
  const a = await requireAdmin();
  const id = String(fd.get("id"));
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u || u.role === "ADMIN") return;
  await prisma.user.update({ where: { id }, data: { blocked: !u.blocked } });
  if (!u.blocked) await prisma.session.deleteMany({ where: { userId: id } });
  await audit(a.id, u.blocked ? "user.unblock" : "user.block", id);
  revalidatePath(`/admin/usuarios/${id}`);
}

export async function grantAccess(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const p = parseForm(z.object({ id: z.string(), planId: z.string().min(1, "Escolha o plano"), until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"), amount: zMoney.optional(), note: zOpt(200) }), fd);
  if (!p.ok) return p.error;
  const until = new Date(p.data.until + "T23:59:59-03:00");
  if (until < new Date()) return { error: "A data precisa ser no futuro." };
  await prisma.user.update({ where: { id: p.data.id }, data: { manualAccessUntil: until, manualPlanId: p.data.planId } });
  if (p.data.amount && p.data.amount > 0) await prisma.payment.create({ data: { userId: p.data.id, amount: p.data.amount, status: "manual", paidAt: new Date(), description: p.data.note || "Pagamento registrado manualmente" } });
  await audit(a.id, "user.grant", p.data.id, `${p.data.planId} até ${p.data.until}`);
  revalidatePath(`/admin/usuarios/${p.data.id}`);
  return { ok: true, message: "Acesso liberado." };
}

export async function revokeAccess(fd: FormData) {
  const a = await requireAdmin();
  const id = String(fd.get("id"));
  await prisma.user.update({ where: { id }, data: { manualAccessUntil: null, manualPlanId: null } });
  await audit(a.id, "user.revoke", id);
  revalidatePath(`/admin/usuarios/${id}`);
}

// ---------- Planos ----------
const planSchema = z.object({ id: z.string().optional(), slug: z.string().regex(/^[a-z0-9-]{2,40}$/, "Use letras minúsculas, números e hífen"), name: zText(2, 40), description: zOpt(200), priceMonthly: zMoney, priceYearly: zMoney, quoteLimit: z.string().optional(), sortOrder: z.coerce.number().int().min(0).max(99) });
export async function savePlan(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const p = parseForm(planSchema, fd);
  if (!p.ok) return p.error;
  const { id, quoteLimit, ...d } = p.data;
  const lim = quoteLimit ? Number(quoteLimit) : null;
  if (lim != null && (!Number.isInteger(lim) || lim < 1)) return { error: "Confira os campos.", fields: { quoteLimit: "Número inteiro ou vazio (ilimitado)" } };
  const data = { ...d, quoteLimit: lim, featBrandFull: bool(fd, "featBrandFull"), featClientHistory: bool(fd, "featClientHistory"), featStatus: bool(fd, "featStatus"), featWhatsapp: bool(fd, "featWhatsapp"), featFinance: bool(fd, "featFinance"), featReports: bool(fd, "featReports"), highlight: bool(fd, "highlight"), active: bool(fd, "active") };
  const dup = await prisma.plan.findFirst({ where: { slug: d.slug, NOT: id ? { id } : undefined } });
  if (dup) return { error: "Confira os campos.", fields: { slug: "Identificador já usado" } };
  if (id) await prisma.plan.update({ where: { id }, data }); else await prisma.plan.create({ data });
  await audit(a.id, id ? "plan.update" : "plan.create", d.slug, JSON.stringify({ m: d.priceMonthly, y: d.priceYearly, lim }));
  revalidatePath("/admin/planos"); revalidatePath("/sistema");
  return { ok: true, message: "Plano salvo. Novos preços valem para novas assinaturas." };
}

// ---------- Biblioteca de serviços ----------
const zOptMoney = z.string().optional().transform((v) => (v ? Number(v.replace(/\s|R\$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")) : null)).refine((n) => n == null || (Number.isFinite(n) && n >= 0), "Valor inválido");
const tplSchema = z.object({ id: z.string().optional(), name: zText(2, 120), description: zOpt(300), unit: zText(1, 20), suggestedPrice: zMoney, minPrice: zOptMoney, maxPrice: zOptMoney, category: zText(2, 60) });
export async function saveTemplate(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const p = parseForm(tplSchema, fd);
  if (!p.ok) return p.error;
  const { id, ...d } = p.data;
  const data = { ...d, active: id ? bool(fd, "active") : true };
  // Atualiza SOMENTE a sugestão — a tabela de cada assinante (UserService) não é alterada.
  if (id) await prisma.serviceTemplate.update({ where: { id }, data }); else await prisma.serviceTemplate.create({ data });
  await audit(a.id, id ? "template.update" : "template.create", d.name, String(d.suggestedPrice));
  revalidatePath("/admin/biblioteca");
  return { ok: true, message: "Salvo" };
}

// ---------- Solicitações (leads) ----------
export async function setLeadStatus(fd: FormData) {
  await requireAdmin();
  const status = z.enum(["NEW", "CONTACTED", "CLOSED", "DISCARDED"]).parse(fd.get("status"));
  await prisma.leadRequest.update({ where: { id: String(fd.get("id")) }, data: { status } });
  revalidatePath("/admin/solicitacoes");
}

// ---------- Serviços anunciados ----------
const svcSchema = z.object({ id: z.string().optional(), slug: z.string().regex(/^[a-z0-9-]{2,80}$/, "Use letras minúsculas, números e hífen"), title: zText(2, 120), summary: zText(10, 300), body: zText(10, 5000), seoTitle: zOpt(70), seoDescription: zOpt(170), sortOrder: z.coerce.number().int().min(0).max(999) });
export async function savePortfolioService(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const p = parseForm(svcSchema, fd);
  if (!p.ok) return p.error;
  const { id, ...d } = p.data;
  const dup = await prisma.portfolioService.findFirst({ where: { slug: d.slug, NOT: id ? { id } : undefined } });
  if (dup) return { error: "Confira os campos.", fields: { slug: "Endereço já usado" } };
  const data = { ...d, published: bool(fd, "published") };
  if (id) await prisma.portfolioService.update({ where: { id }, data }); else await prisma.portfolioService.create({ data });
  await audit(a.id, "site.service", d.slug);
  revalidatePath("/", "layout");
  return { ok: true, message: "Serviço salvo." };
}
export async function deletePortfolioService(fd: FormData) {
  await requireAdmin();
  await prisma.portfolioService.delete({ where: { id: String(fd.get("id")) } });
  revalidatePath("/", "layout");
}

// ---------- Portfólio (trabalhos e fotos) ----------
export async function saveWork(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const p = parseForm(z.object({ id: z.string().optional(), title: zText(3, 120, "Informe o título"), description: zOpt(1000), neighborhood: zOpt(80), serviceSlug: zOpt(80) }), fd);
  if (!p.ok) return p.error;
  const { id, ...d } = p.data;
  const data = { ...d, published: bool(fd, "published") };
  const photos: { kind: string; file: File }[] = [];
  for (const kind of ["ANTES", "DEPOIS", "GERAL"]) for (const f of fd.getAll(`photos_${kind}`)) if (f instanceof File && f.size > 0) photos.push({ kind, file: f });
  if (photos.length > 12) return { error: "Envie no máximo 12 fotos por vez." };
  try {
    const processed = await Promise.all(photos.map(async (x) => ({ kind: x.kind, ...(await processImage(x.file, { maxW: 1600, format: "webp" })) })));
    const work = id ? await prisma.portfolioWork.update({ where: { id }, data }) : await prisma.portfolioWork.create({ data });
    const base = await prisma.portfolioPhoto.count({ where: { workId: work.id } });
    if (processed.length) await prisma.portfolioPhoto.createMany({ data: processed.map((ph, i) => ({ workId: work.id, kind: ph.kind, data: ph.data, mime: ph.mime, width: ph.width, height: ph.height, position: base + i })) });
  } catch (e) { if (e instanceof ImageError) return { error: e.message }; throw e; }
  await audit(a.id, "site.work", d.title);
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Trabalho atualizado." : "Trabalho cadastrado!" };
}
export async function deleteWork(fd: FormData) { await requireAdmin(); await prisma.portfolioWork.delete({ where: { id: String(fd.get("id")) } }); revalidatePath("/", "layout"); }
export async function deletePhoto(fd: FormData) { await requireAdmin(); await prisma.portfolioPhoto.delete({ where: { id: String(fd.get("id")) } }); revalidatePath("/", "layout"); }

// ---------- Depoimentos ----------
export async function saveTestimonial(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = parseForm(z.object({ id: z.string().optional(), authorName: zText(2, 80, "Nome do cliente"), neighborhood: zOpt(80), text: zText(10, 600, "Escreva o depoimento"), rating: z.coerce.number().int().min(1).max(5) }), fd);
  if (!p.ok) return p.error;
  const { id, ...d } = p.data;
  const data = { ...d, published: bool(fd, "published") };
  if (id) await prisma.testimonial.update({ where: { id }, data }); else await prisma.testimonial.create({ data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Depoimento salvo." };
}
export async function deleteTestimonial(fd: FormData) { await requireAdmin(); await prisma.testimonial.delete({ where: { id: String(fd.get("id")) } }); revalidatePath("/", "layout"); }

// ---------- Textos do site e regiões ----------
export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const ops = Object.keys(SETTING_DEFAULTS).map((key) => {
    const value = String(fd.get(key) ?? "").trim().slice(0, 3000);
    return prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  });
  const wa = String(fd.get("whatsapp") || "").replace(/\D/g, "");
  if (wa.length < 10 || wa.length > 13) return { error: "Confira os campos.", fields: { whatsapp: "WhatsApp inválido (DDD + número)" } };
  await prisma.$transaction(ops);
  await audit(a.id, "site.settings");
  revalidatePath("/", "layout");
  return { ok: true, message: "Textos atualizados no site." };
}
export async function addArea(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(fd.get("name") || "").trim().slice(0, 80);
  if (name.length < 2) return { error: "Informe o bairro ou cidade." };
  await prisma.serviceArea.upsert({ where: { name }, update: {}, create: { name, sortOrder: await prisma.serviceArea.count() } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Adicionado." };
}
export async function deleteArea(fd: FormData) { await requireAdmin(); await prisma.serviceArea.delete({ where: { id: String(fd.get("id")) } }); revalidatePath("/", "layout"); }

// ---------- Foto de perfil (seção "Sobre mim") ----------
export async function saveProfilePhoto(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const f = fd.get("photo");
  if (!(f instanceof File) || f.size === 0) return { error: "Escolha uma foto." };
  try {
    const img = await processImage(f, { maxW: 900, maxH: 1125, format: "webp" });
    await prisma.siteImage.upsert({ where: { key: "profile" }, update: { data: img.data, mime: img.mime }, create: { key: "profile", data: img.data, mime: img.mime } });
  } catch (e) { if (e instanceof ImageError) return { error: e.message }; throw e; }
  await audit(a.id, "site.photo");
  revalidatePath("/", "layout");
  return { ok: true, message: "Foto atualizada no site." };
}
export async function removeProfilePhoto() {
  await requireAdmin();
  await prisma.siteImage.deleteMany({ where: { key: "profile" } });
  revalidatePath("/", "layout");
}

// ---------- Assinaturas: verificação e ativação manual ----------
export async function adminVerifySubscription(fd: FormData) {
  const a = await requireAdmin();
  const id = String(fd.get("id"));
  try { await syncSubscription(id); } catch (e) { console.error(e); }
  await audit(a.id, "sub.verify", id);
  revalidatePath("/admin", "layout");
}
export async function adminVerifyAll() {
  const a = await requireAdmin();
  const r = await syncOpenSubscriptions();
  await audit(a.id, "sub.verify_all", undefined, JSON.stringify(r));
  revalidatePath("/admin", "layout");
}
export async function adminActivateSubscription(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const p = parseForm(z.object({ id: z.string().min(1), amount: zMoney, note: zOpt(200) }), fd);
  if (!p.ok) return p.error;
  await activateManually(p.data.id, p.data.amount, p.data.note || "Pagamento confirmado manualmente pelo administrador");
  await audit(a.id, "sub.activate_manual", p.data.id, String(p.data.amount));
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Assinatura ativada e pagamento registrado." };
}
