import { publicQuote } from "@/lib/public-quote";
import { renderQuotePdf, pdfFilename, pdfError } from "@/lib/pdf/QuotePdf";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(_: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  try {
    const d = await publicQuote(token);
    if (!d) return new Response("Not found", { status: 404 });
    const buf = await renderQuotePdf(d);
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${pdfFilename(d.quote)}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
  } catch (e) {
    return pdfError(e, `/o/${token}`);
  }
}
