"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseForm, zText, zOpt, type ActionState } from "@/lib/form";

const schema = z.object({ id: z.string().optional(), name: zText(2, 120, "Informe o nome"), phone: zOpt(20), email: zOpt(160), address: zOpt(250), notes: zOpt(1000), back: z.string().optional() });

export async function saveClient(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = parseForm(schema, fd);
  if (!p.ok) return p.error;
  const { id, back, ...data } = p.data;
  if (data.email && !z.string().email().safeParse(data.email).success) return { error: "Confira os campos.", fields: { email: "E-mail inválido" } };
  let clientId = id;
  if (id) {
    const r = await prisma.client.updateMany({ where: { id, userId: user.id }, data });
    if (!r.count) return { error: "Cliente não encontrado." };
  } else {
    clientId = (await prisma.client.create({ data: { ...data, userId: user.id } })).id;
  }
  revalidatePath("/painel/clientes");
  if (back === "quote") redirect(`/painel/orcamentos/novo?cliente=${clientId}`);
  return { ok: true, message: id ? "Cliente atualizado." : "Cliente cadastrado!", data: { id: clientId! } };
}

export async function deleteClient(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") || "");
  await prisma.client.deleteMany({ where: { id, userId: user.id } }); // orçamentos mantêm a cópia do nome
  revalidatePath("/painel/clientes");
  redirect("/painel/clientes");
}
