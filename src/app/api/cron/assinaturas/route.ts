import { syncOpenSubscriptions } from "@/lib/mercadopago";
import { mpConfigured } from "@/lib/env";
import { safeEqualHex, sha256 } from "@/lib/crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Rotina diária (Vercel Cron): confere no Mercado Pago as assinaturas pendentes e as que vencem em breve.
// A Vercel envia "Authorization: Bearer <CRON_SECRET>" quando a variável CRON_SECRET existe.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!secret || !safeEqualHex(sha256(got), sha256(secret))) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!mpConfigured()) return Response.json({ skipped: "Mercado Pago não configurado" });
  return Response.json(await syncOpenSubscriptions());
}
