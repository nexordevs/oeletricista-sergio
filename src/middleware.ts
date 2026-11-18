import { NextResponse, type NextRequest } from "next/server";
// Barreira rápida: sem cookie de sessão não entra no painel/admin.
// A verificação real (sessão válida, papel ADMIN, assinatura) acontece no servidor em cada página/ação.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("sid")) {
    const url = new URL("/entrar", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/painel/:path*", "/admin/:path*"] };
