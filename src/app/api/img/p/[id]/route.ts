import { prisma } from "@/lib/db";
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const p = await prisma.portfolioPhoto.findFirst({ where: { id: params.id, work: { published: true } }, select: { data: true, mime: true } });
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(p.data, { headers: { "Content-Type": p.mime, "Cache-Control": "public, max-age=86400, immutable" } });
}
