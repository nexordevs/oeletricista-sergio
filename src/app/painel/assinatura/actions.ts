"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mpConfigured } from "@/lib/env";
import { createPreapproval, cancelPreapproval, syncSubscription } from "@/lib/mercadopago";
import type { ActionState } from "@/lib/form";

export async function subscribe(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = z.object({ planId: z.string().min(1), cycle: z.enum(["MONTHLY", "YEARLY"]) }).safeParse({ planId: fd.get("planId"), cycle: fd.get("cycle") });
  if (!p.success) return { error: "Escolha um plano." };
  if (!mpConfigured()) return { error: "O pagamento online ainda não foi configurado pela administração. Fale com o suporte para liberar seu acesso." };
  const plan = await prisma.plan.findFirst({ where: { id: p.data.planId, active: true } });
  if (!plan) return { error: "Plano indisponível." };
  // Preço sempre lido do banco — nunca do navegador
  const amount = p.data.cycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
  const sub = await prisma.subscription.create({ data: { userId: user.id, planId: plan.id, cycle: p.data.cycle, amount, status: "PENDING" }, include: { plan: true } });
  let url: string;
  try { url = await createPreapproval(sub, user.email); }
  catch (e) {
    console.error(e);
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
    return { error: "Não foi possível iniciar o pagamento no Mercado Pago. Tente novamente em instantes." };
  }
  redirect(url);
}

export async function cancelSubscription(fd: FormData) {
  const user = await requireUser();
  const sub = await prisma.subscription.findFirst({ where: { id: String(fd.get("id")), userId: user.id } });
  if (!sub) return;
  if (sub.mpPreapprovalId) await cancelPreapproval(sub.mpPreapprovalId);
  await prisma.subscription.update({ where: { id: sub.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  revalidatePath("/painel/assinatura");
}

export async function checkPayment(fd: FormData) {
  const user = await requireUser();
  const sub = await prisma.subscription.findFirst({ where: { id: String(fd.get("id")), userId: user.id } });
  if (sub?.mpPreapprovalId) await syncSubscription(sub.id).catch((e) => console.error(e));
  revalidatePath("/painel/assinatura");
}
