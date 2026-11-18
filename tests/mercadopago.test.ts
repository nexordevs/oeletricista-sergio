// Testa a lógica de assinatura com respostas do Mercado Pago simuladas APENAS neste teste.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
process.env.MP_ACCESS_TOKEN = "TEST-token";
process.env.MP_WEBHOOK_SECRET = "segredo-teste";
import { createHmac } from "crypto";
import { prisma } from "../src/lib/db";
import { verifyWebhookSignature, syncSubscription } from "../src/lib/mercadopago";
import { getAccess } from "../src/lib/access";

let userId = "", subId = "";
const realFetch = globalThis.fetch;
let mp: Record<string, unknown> = {};
before(async () => {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { slug: "profissional" } });
  const u = await prisma.user.create({ data: { email: `mp-${Date.now()}@teste.local`, name: "MP Teste", passwordHash: "x" } });
  userId = u.id;
  subId = (await prisma.subscription.create({ data: { userId, planId: plan.id, amount: plan.priceMonthly, status: "PENDING", mpPreapprovalId: `pre_${Date.now()}` } })).id;
  globalThis.fetch = (async (url: string) => {
    const key = Object.keys(mp).find((k) => String(url).includes(k));
    return new Response(JSON.stringify(key ? mp[key] : {}), { status: key ? 200 : 404 });
  }) as typeof fetch;
});
after(async () => { globalThis.fetch = realFetch; await prisma.user.delete({ where: { id: userId } }); await prisma.$disconnect(); });

test("assinatura do webhook: válida passa, adulterada falha", () => {
  const ts = "1700000000", rid = "req-1", id = "123456";
  const v1 = createHmac("sha256", "segredo-teste").update(`id:${id};request-id:${rid};ts:${ts};`).digest("hex");
  assert.equal(verifyWebhookSignature(`ts=${ts},v1=${v1}`, rid, id), true);
  assert.equal(verifyWebhookSignature(`ts=${ts},v1=${v1}`, rid, "999"), false);
  assert.equal(verifyWebhookSignature(null, rid, id), false);
});

test("sem pagamento aprovado a conta NÃO é ativada", async () => {
  const s = await prisma.subscription.findUniqueOrThrow({ where: { id: subId } });
  mp = { [`/preapproval/${s.mpPreapprovalId}`]: { id: s.mpPreapprovalId, status: "authorized", external_reference: subId }, "/authorized_payments/search": { results: [] } };
  const r = await syncSubscription(subId);
  assert.equal(r?.status, "PENDING");
  assert.equal((await getAccess(await prisma.user.findUniqueOrThrow({ where: { id: userId } }))).active, false);
});

test("pagamento aprovado ativa a conta e registra o pagamento (idempotente)", async () => {
  const s = await prisma.subscription.findUniqueOrThrow({ where: { id: subId } });
  mp = { [`/preapproval/${s.mpPreapprovalId}`]: { id: s.mpPreapprovalId, status: "authorized", external_reference: subId },
    "/authorized_payments/search": { results: [{ id: 1, preapproval_id: s.mpPreapprovalId, status: "processed", debit_date: new Date().toISOString(), transaction_amount: 34.9, payment: { id: 777, status: "approved" } }] } };
  await syncSubscription(subId); const r = await syncSubscription(subId);
  assert.equal(r?.status, "ACTIVE");
  assert.equal(await prisma.payment.count({ where: { subscriptionId: subId } }), 1);
  const a = await getAccess(await prisma.user.findUniqueOrThrow({ where: { id: userId } }));
  assert.equal(a.active, true); assert.equal(a.plan?.slug, "profissional");
});

test("referência externa diferente é rejeitada", async () => {
  const s = await prisma.subscription.findUniqueOrThrow({ where: { id: subId } });
  mp = { [`/preapproval/${s.mpPreapprovalId}`]: { id: s.mpPreapprovalId, status: "authorized", external_reference: "outra" }, "/authorized_payments/search": { results: [] } };
  await assert.rejects(() => syncSubscription(subId));
});

test("cancelada mantém acesso só até o fim do período pago", async () => {
  const s = await prisma.subscription.findUniqueOrThrow({ where: { id: subId } });
  mp[`/preapproval/${s.mpPreapprovalId}`] = { id: s.mpPreapprovalId, status: "cancelled", external_reference: subId };
  mp["/authorized_payments/search"] = { results: [{ id: 1, preapproval_id: s.mpPreapprovalId, status: "processed", debit_date: new Date().toISOString(), transaction_amount: 34.9, payment: { id: 777, status: "approved" } }] };
  const r = await syncSubscription(subId);
  assert.equal(r?.status, "CANCELLED");
  assert.equal((await getAccess(await prisma.user.findUniqueOrThrow({ where: { id: userId } }))).active, true);
  await prisma.subscription.update({ where: { id: subId }, data: { currentPeriodEnd: new Date(Date.now() - 1000) } });
  assert.equal((await getAccess(await prisma.user.findUniqueOrThrow({ where: { id: userId } }))).active, false);
});
