import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
// Imagem da marca do próprio usuário logado (prévia no painel)
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const kind = new URL(req.url).searchParams.get("k") === "signature" ? "signature" : "logo";
  const b = await prisma.brand.findUnique({ where: { userId: u.id }, select: { logo: true, logoMime: true, signature: true, signatureMime: true } });
  const data = kind === "logo" ? b?.logo : b?.signature;
  const mime = kind === "logo" ? b?.logoMime : b?.signatureMime;
  if (!data || !mime) return new Response("Not found", { status: 404 });
  return new Response(data, { headers: { "Content-Type": mime, "Cache-Control": "private, no-cache" } });
}
