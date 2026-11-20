import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { renderQuotePdf, pdfFilename, pdfError } from "@/lib/pdf/QuotePdf";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const user = await getUser();
    if (!user) return Response.redirect(new URL("/entrar", req.url), 303);
    const quote = await prisma.quote.findFirst({ where: { id, userId: user.id }, include: { items: { orderBy: { position: "asc" } } } });
    if (!quote) return new Response("Orçamento não encontrado", { status: 404 });
    const brand = await prisma.brand.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, professionalName: user.name } });
    const buf = await renderQuotePdf({ brand, quote });
    const inline = new URL(req.url).searchParams.get("ver") === "1";
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${pdfFilename(quote)}"`, "Cache-Control": "private, no-store" } });
  } catch (e) {
    return pdfError(e, `/painel/orcamentos/${id}`, true);
  }
}
