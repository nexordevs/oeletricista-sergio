import "server-only";
import { prisma } from "./db";
import { env } from "./env";
import { hmacSha256Hex, safeEqualHex } from "./crypto";
import { toNum } from "./money";
import type { Subscription, Plan } from "@prisma/client";

const API = "https://api.mercadopago.com";

async function mp<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.mpAccessToken) throw new Error("MP_ACCESS_TOKEN não configurado.");
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${env.mpAccessToken}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T;
}

type Preapproval = { id: string; status: string; init_point: string; external_reference?: string; payer_email?: string };
type AuthorizedPayment = {
  id: number | string; preapproval_id: string; status: string; debit_date?: string; date_created?: string;
  transaction_amount: number; payment?: { id: number | string; status: string; status_detail?: string };
};

export async function createPreapproval(sub: Subscription & { plan: Plan }, payerEmail: string) {
  const yearly = sub.cycle === "YEARLY";
  const pre = await mp<Preapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `Assinatura ${sub.plan.name} (${yearly ? "anual" : "mensal"})`,
      external_reference: sub.id,
      payer_email: payerEmail,
      back_url: `${env.appUrl}/painel/assinatura/retorno?s=${sub.id}`,
      auto_recurring: { frequency: yearly ? 12 : 1, frequency_type: "months", transaction_amount: toNum(sub.amount), currency_id: "BRL" },
      status: "pending",
    }),
  });
  await prisma.subscription.update({ where: { id: sub.id }, data: { mpPreapprovalId: pre.id, mpStatus: pre.status } });
  return pre.init_point;
}

export async function cancelPreapproval(id: string) {
  return mp<Preapproval>(`/preapproval/${id}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
}

const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };
const GRACE_MS = 3 * 864e5; // tolerância para a próxima cobrança recorrente

/**
 * Sincroniza uma assinatura consultando o Mercado Pago no servidor.
 * Só ativa/estende acesso a partir de pagamentos com status "approved" retornados pela API.
 * Idempotente: pode ser chamada pelo webhook, pela página de retorno ou por um botão "verificar".
 */
export async function syncSubscription(subId: string) {
  const sub = await prisma.subscription.findUnique({ where: { id: subId } });
  if (!sub?.mpPreapprovalId) return sub;
  const pre = await mp<Preapproval>(`/preapproval/${sub.mpPreapprovalId}`);
  if (pre.external_reference && pre.external_reference !== sub.id) throw new Error("Referência externa não confere.");
  const search = await mp<{ results: AuthorizedPayment[] }>(`/authorized_payments/search?preapproval_id=${sub.mpPreapprovalId}&limit=100`);
  const months = sub.cycle === "YEARLY" ? 12 : 1;
  const extra = await mp<{ results: { id: number; status: string; date_approved?: string; date_created?: string; transaction_amount: number }[] }>(
    `/v1/payments/search?external_reference=${encodeURIComponent(sub.id)}&sort=date_created&criteria=asc&limit=100`).catch(() => ({ results: [] }));
  const known = new Set((search.results || []).map((a) => String(a.payment?.id ?? "")));
  for (const p of extra.results || []) {
    if (known.has(String(p.id))) continue;
    (search.results ||= []).push({ id: `p${p.id}`, preapproval_id: sub.mpPreapprovalId, status: p.status, debit_date: p.date_approved || p.date_created, transaction_amount: p.transaction_amount, payment: { id: p.id, status: p.status } });
  }
  let periodEnd = sub.currentPeriodEnd;
  let lastFailed = false;
  const results = [...(search.results || [])].sort((a, b) => +new Date(a.debit_date || a.date_created || 0) - +new Date(b.debit_date || b.date_created || 0));
  for (const ap of results) {
    const payStatus = ap.payment?.status || ap.status;
    const payId = String(ap.payment?.id || `ap_${ap.id}`);
    const when = new Date(ap.debit_date || ap.date_created || Date.now());
    if (payStatus === "approved") {
      lastFailed = false;
      await prisma.payment.upsert({
        where: { mpPaymentId: payId },
        update: { status: "approved" },
        create: { mpPaymentId: payId, userId: sub.userId, subscriptionId: sub.id, amount: ap.transaction_amount, status: "approved", paidAt: when, description: "Mensalidade via Mercado Pago" },
      });
      const end = new Date(addMonths(when, months).getTime() + GRACE_MS);
      if (!periodEnd || end > periodEnd) periodEnd = end;
    } else if (["rejected", "cancelled"].includes(payStatus)) {
      lastFailed = true;
      await prisma.payment.upsert({
        where: { mpPaymentId: payId }, update: { status: payStatus },
        create: { mpPaymentId: payId, userId: sub.userId, subscriptionId: sub.id, amount: ap.transaction_amount, status: payStatus, description: "Tentativa de cobrança" },
      });
    }
  }
  let status = sub.status;
  if (pre.status === "cancelled") status = "CANCELLED";
  else if (periodEnd && periodEnd > new Date()) status = lastFailed ? "PAST_DUE" : "ACTIVE";
  else if (periodEnd) status = lastFailed || pre.status === "paused" ? "PAST_DUE" : "EXPIRED";
  else status = "PENDING";
  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { mpStatus: pre.status, status, currentPeriodEnd: periodEnd, cancelledAt: pre.status === "cancelled" ? sub.cancelledAt ?? new Date() : sub.cancelledAt },
  });
  // Troca de plano: quando a nova assinatura é ativada, as anteriores são canceladas no Mercado Pago.
  if (status === "ACTIVE" && sub.status !== "ACTIVE") {
    const others = await prisma.subscription.findMany({ where: { userId: sub.userId, id: { not: sub.id }, status: { in: ["ACTIVE", "PAST_DUE", "PENDING"] } } });
    for (const o of others) {
      if (o.mpPreapprovalId) await cancelPreapproval(o.mpPreapprovalId).catch((e) => console.error("Falha ao cancelar assinatura antiga", o.id, e));
      await prisma.subscription.update({ where: { id: o.id }, data: { status: "CANCELLED", cancelledAt: new Date(), currentPeriodEnd: new Date() } });
    }
  }
  return updated;
}

/**
 * Cancela uma assinatura: primeiro no Mercado Pago (para não haver novas cobranças), depois no sistema.
 * Se o Mercado Pago recusar, lança erro e NADA é marcado como cancelado.
 * O acesso continua até o fim do período já pago.
 */
export async function cancelSubscriptionById(subId: string) {
  const sub = await prisma.subscription.findUniqueOrThrow({ where: { id: subId } });
  if (sub.status === "CANCELLED") return sub;
  if (sub.mpPreapprovalId) {
    try { await cancelPreapproval(sub.mpPreapprovalId); }
    catch (e) {
      // Se já estiver cancelada lá (ex.: pelo app do Mercado Pago), segue normalmente
      const pre = await mp<Preapproval>(`/preapproval/${sub.mpPreapprovalId}`).catch(() => null);
      if (pre?.status !== "cancelled") throw e;
    }
  }
  return prisma.subscription.update({ where: { id: sub.id }, data: { status: "CANCELLED", cancelledAt: new Date(), ...(sub.status === "PENDING" ? { currentPeriodEnd: null } : {}) } });
}

/** Ativação manual pelo administrador (ex.: pagamento por Pix fora do Mercado Pago). Registra o valor no histórico. */
export async function activateManually(subId: string, amount: number, note: string) {
  const sub = await prisma.subscription.findUniqueOrThrow({ where: { id: subId } });
  const months = sub.cycle === "YEARLY" ? 12 : 1;
  const base = sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
  await prisma.$transaction([
    prisma.payment.create({ data: { userId: sub.userId, subscriptionId: sub.id, amount, status: "manual", paidAt: new Date(), description: note || "Pagamento confirmado manualmente" } }),
    prisma.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", currentPeriodEnd: addMonths(base, months) } }),
  ]);
}

/** Conferência em lote (usada pela rotina diária e pelo admin). */
export async function syncOpenSubscriptions(limit = 200) {
  const subs = await prisma.subscription.findMany({
    where: { mpPreapprovalId: { not: null }, OR: [
      { status: "PENDING", createdAt: { gt: new Date(Date.now() - 15 * 864e5) } },
      { status: { in: ["ACTIVE", "PAST_DUE"] }, currentPeriodEnd: { lt: new Date(Date.now() + 5 * 864e5) } },
    ] },
    take: limit, orderBy: { updatedAt: "asc" },
  });
  let ok = 0, failed = 0;
  for (const s of subs) { try { await syncSubscription(s.id); ok++; } catch (e) { failed++; console.error("sync", s.id, e); } }
  // Sem Mercado Pago (ex.: acesso manual vencido): marca como expiradas
  await prisma.subscription.updateMany({ where: { mpPreapprovalId: null, status: "ACTIVE", currentPeriodEnd: { lt: new Date() } }, data: { status: "EXPIRED" } });
  return { checked: subs.length, ok, failed };
}

/** Valida a assinatura do webhook (cabeçalho x-signature) conforme documentação do Mercado Pago. */
export function verifyWebhookSignature(xSignature: string | null, xRequestId: string | null, dataId: string | null) {
  if (!env.mpWebhookSecret || !xSignature) return false;
  const parts = Object.fromEntries(xSignature.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const ts = parts.ts, v1 = parts.v1;
  if (!ts || !v1) return false;
  let manifest = "";
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;
  return safeEqualHex(hmacSha256Hex(env.mpWebhookSecret, manifest), v1);
}

/** Descobre a assinatura local a partir de um evento de webhook e sincroniza. */
export async function handleWebhook(topic: string, resourceId: string) {
  let preapprovalId: string | null = null;
  if (topic.includes("authorized_payment")) {
    const ap = await mp<AuthorizedPayment>(`/authorized_payments/${resourceId}`);
    preapprovalId = ap.preapproval_id;
  } else if (topic.includes("preapproval")) {
    preapprovalId = resourceId;
  } else if (topic === "payment") {
    const p = await mp<{ metadata?: { preapproval_id?: string }; point_of_interaction?: { transaction_data?: { subscription_id?: string } } }>(`/v1/payments/${resourceId}`);
    preapprovalId = p.point_of_interaction?.transaction_data?.subscription_id || p.metadata?.preapproval_id || null;
  }
  if (!preapprovalId) return null;
  const sub = await prisma.subscription.findUnique({ where: { mpPreapprovalId: preapprovalId } });
  if (!sub) return null;
  return syncSubscription(sub.id);
}
