import { publicQuote } from "@/lib/public-quote";
export async function GET(_: Request, { params }: { params: { token: string } }) {
  const d = await publicQuote(params.token);
  if (!d?.brand.logo || !d.brand.logoMime) return new Response("Not found", { status: 404 });
  return new Response(d.brand.logo, { headers: { "Content-Type": d.brand.logoMime, "Cache-Control": "private, max-age=3600" } });
}
