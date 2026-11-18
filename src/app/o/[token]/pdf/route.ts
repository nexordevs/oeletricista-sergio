import { publicQuote } from "@/lib/public-quote";
import { renderQuotePdf, pdfFilename } from "@/lib/pdf/QuotePdf";
export const runtime = "nodejs";
export async function GET(_: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const d = await publicQuote(params.token);
  if (!d) return new Response("Not found", { status: 404 });
  const buf = await renderQuotePdf(d);
  return new Response(buf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${pdfFilename(d.quote)}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
