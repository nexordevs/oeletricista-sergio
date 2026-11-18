"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mpConfigured } from "@/lib/env";
import { createPreapproval, cancelPreapproval, syncSubscription } from "@/lib/mercadopago";
import type { ActionState } from "@/lib/form";
import { rateLimit } from "@/lib/rate-limit";

export async function subscribe(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = z.object({ planId: z.string().min(1), cycle: z.enum(["MONTHLY", "YEARLY"]), payerEmail: z.string().trim().toLowerCase().pipe(z.email()) })
    .safeParse({ planId: fd.get("planId"), cycle: fd.get("cycle"), payerEmail: fd.get("payerEmail") || user.email });
  if (!p.success) return { error: p.error.issues.some((i) => i.path[0] === "payerEmail") ? "Informe um e-mail válido da sua conta Mercado Pago." : "Escolha um plano." };
  if (!mpConfigured()) return { error: "O pagamento online ainda não foi configurado pela administração. Fale com o suporte para liberar seu acesso." };
  const plan = await prisma.plan.findFirst({ where: { id: p.data.planId, active: true } });
  if (!plan) return { error: "Plano indisponível." };
  // Preço sempre lido do banco — nunca do navegador
  const amount = p.data.cycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
  const sub = await prisma.subscription.create({ data: { userId: user.id, planId: plan.id, cycle: p.data.cycle, amount, status: "PENDING" }, include: { plan: true } });
  let url: string;
  try { url = await createPreapproval(sub, p.data.payerEmail); }
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

/** "Já paguei": consulta o Mercado Pago no servidor e devolve a situação. Nunca ativa sem pagamento aprovado. */
export async function verifyPayment(subId: string): Promise<{ status: string; message: string }> {
  const user = await requireUser();
  const sub = await prisma.subscription.findFirst({ where: { id: subId, userId: user.id } });
  if (!sub) return { status: "NOT_FOUND", message: "Assinatura não encontrada." };
  if (!rateLimit(`verify:${user.id}`, 60, 10 * 60e3)) return { status: sub.status, message: "Muitas verificações seguidas. Aguarde alguns minutos." };
  let status = sub.status;
  if (sub.mpPreapprovalId) {
    try { status = (await syncSubscription(sub.id))?.status ?? status; }
    catch (e) { console.error(e); return { status, message: "Não consegui falar com o Mercado Pago agora. Tente de novo em instantes." }; }
  }
  if (status === "ACTIVE") { revalidatePath("/painel", "layout"); return { status, message: "Pagamento confirmado! Sua assinatura está ativa." }; }
  return { status, message: "O Mercado Pago ainda não confirmou o pagamento. Pix e cartão costumam levar poucos minutos; boleto pode levar até 3 dias úteis." };
}
