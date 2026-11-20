// Videoaulas: conversão segura de links de vídeo e regra de acesso aos cursos.
import type { CourseAccess } from "@prisma/client";

/** Converte o link colado pelo admin em URL de player embutido. Só aceita YouTube, Vimeo e Panda Video. */
export function embedUrl(raw: string): string | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const yt = (id: string | null | undefined) => (id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null);
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") return yt(u.searchParams.get("v"));
    const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{11})/);
    return m ? yt(m[2]) : null;
  }
  if (host === "youtu.be") return yt(u.pathname.slice(1).split("/")[0]);
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(?:\/video)?\/(\d{6,12})(?:\/([0-9a-f]{6,20}))?/);
    if (!m) return null;
    const h = m[2] || u.searchParams.get("h");
    return `https://player.vimeo.com/video/${m[1]}${h && /^[0-9a-f]{6,20}$/.test(h) ? `?h=${h}` : ""}`;
  }
  if (/^[a-z0-9-]+\.tv\.pandavideo\.com\.br$/.test(host) && u.pathname.startsWith("/embed")) {
    const v = u.searchParams.get("v");
    return v && /^[\w-]{8,64}$/.test(v) ? `https://${host}/embed/?v=${v}` : null;
  }
  return null;
}

export const ACCESS_LABEL: Record<CourseAccess, string> = { FREE: "Grátis", SUBSCRIBERS: "Plano Premium", PAID: "Curso pago" };

/** Quem pode assistir: grátis = qualquer cadastrado; assinantes = plano com videoaulas (Premium); pago = ainda não vendido (só admin). */
export function canWatch(access: CourseAccess, opts: { isAdmin: boolean; hasCourses: boolean }) {
  if (opts.isAdmin) return true;
  if (access === "FREE") return true;
  if (access === "SUBSCRIBERS") return opts.hasCourses;
  return false;
}
