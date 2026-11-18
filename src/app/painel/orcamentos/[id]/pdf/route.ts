import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { renderQuotePdf, pdfFilename } from "@/lib/pdf/QuotePdf";
export const runtime = "nodejs";
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const quote = await prisma.quote.findFirst({ where: { id: params.id, userId: user.id }, include: { items: true } });
  if (!quote) return new Response("Not found", { status: 404 });
  const brand = await prisma.brand.findUnique({ where: { userId: user.id } });
  if (!brand) return new Response("Configure sua marca", { status: 400 });
  const buf = await renderQuotePdf({ brand, quote });
  const inline = new URL(req.url).searchParams.get("ver") === "1";
  return new Response(buf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${pdfFilename(quote)}"`, "Cache-Control": "private, no-store" } });
}
