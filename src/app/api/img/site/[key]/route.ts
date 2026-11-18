import { prisma } from "@/lib/db";
export async function GET(_: Request, props: { params: Promise<{ key: string }> }) {
  const params = await props.params;
  const img = await prisma.siteImage.findUnique({ where: { key: params.key } });
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(img.data, { headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=86400" } });
}
