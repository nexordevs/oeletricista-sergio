import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
// Prévia de foto no admin (inclui trabalhos não publicados)
export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const u = await getUser();
  if (u?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const p = await prisma.portfolioPhoto.findUnique({ where: { id: params.id }, select: { data: true, mime: true } });
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(p.data, { headers: { "Content-Type": p.mime, "Cache-Control": "private, max-age=3600" } });
}
