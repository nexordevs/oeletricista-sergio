import { prisma } from "@/lib/db";
export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const p = await prisma.portfolioPhoto.findFirst({ where: { id: params.id, work: { published: true } }, select: { data: true, mime: true } });
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(p.data, { headers: { "Content-Type": p.mime, "Cache-Control": "public, max-age=86400, immutable" } });
}
