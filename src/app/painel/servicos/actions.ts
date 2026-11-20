"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { provisionServices } from "@/lib/provision";
import { parseForm, zText, zMoney, zOpt, type ActionState } from "@/lib/form";

const schema = z.object({ id: z.string().optional(), name: zText(2, 120, "Informe o nome"), unit: zText(1, 20, "Unidade"), price: zMoney, category: zOpt(60), description: zOpt(300), kind: z.enum(["SERVICE", "MATERIAL"]).default("SERVICE") });

export async function saveService(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = parseForm(schema, fd);
  if (!p.ok) return p.error;
  const { id, category, ...d } = p.data;
  const data = { ...d, category: category || (d.kind === "MATERIAL" ? "Meus materiais" : "Meus serviços") };
  if (id) {
    // where inclui userId: um eletricista nunca altera a tabela de outro
    const r = await prisma.userService.updateMany({ where: { id, userId: user.id }, data });
    if (!r.count) return { error: "Serviço não encontrado." };
  } else await prisma.userService.create({ data: { ...data, userId: user.id } });
  revalidatePath("/painel/servicos");
  return { ok: true, message: id ? "Salvo" : d.kind === "MATERIAL" ? "Material adicionado!" : "Serviço adicionado!" };
}

export async function deleteService(fd: FormData) {
  const user = await requireUser();
  await prisma.userService.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  revalidatePath("/painel/servicos");
}

export async function importLibrary(fd: FormData) {
  const user = await requireUser();
  await provisionServices(user.id, fd.get("kind") === "MATERIAL" ? "MATERIAL" : "SERVICE");
  revalidatePath("/painel/servicos");
}

export async function saveMarkup(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const n = Number(String(fd.get("materialMarkup") ?? "").replace("%", "").replace(",", ".").trim() || "0");
  if (!Number.isFinite(n) || n < 0 || n > 500) return { error: "Informe uma margem entre 0 e 500%.", fields: { materialMarkup: "Entre 0 e 500%" } };
  await prisma.brand.upsert({ where: { userId: user.id }, update: { materialMarkup: Math.round(n) }, create: { userId: user.id, professionalName: user.name, materialMarkup: Math.round(n) } });
  revalidatePath("/painel/servicos");
  return { ok: true, message: `Margem de ${Math.round(n)}% salva. Os materiais da tabela já entram no orçamento com esse ganho.` };
}
