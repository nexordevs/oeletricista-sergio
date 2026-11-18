import { prisma } from "@/lib/db";
import { verifyWebhookSignature, handleWebhook } from "@/lib/mercadopago";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Configure no painel do Mercado Pago: URL = {APP_URL}/api/webhooks/mercadopago
// Eventos: Planos e assinaturas (subscription_preapproval, subscription_authorized_payment) e Pagamentos.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const topic = String(body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic") || "");
  const dataId = url.searchParams.get("data.id") || String((body.data as { id?: string })?.id || url.searchParams.get("id") || "");
  const requestId = req.headers.get("x-request-id");
  if (!verifyWebhookSignature(req.headers.get("x-signature"), requestId, dataId || null)) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }
  const ev = await prisma.webhookEvent.create({ data: { provider: "mercadopago", topic, resourceId: dataId, requestId } });
  try {
    if (dataId) await handleWebhook(topic, dataId);
    await prisma.webhookEvent.update({ where: { id: ev.id }, data: { processed: true } });
  } catch (e) {
    await prisma.webhookEvent.update({ where: { id: ev.id }, data: { error: String(e).slice(0, 500) } });
    return Response.json({ error: "processing failed" }, { status: 500 }); // MP tentará novamente
  }
  return Response.json({ ok: true });
}
