import Link from "next/link";
import { Emblem } from "./Logo";
import { fmtPhone } from "@/lib/money";

export function SiteFooter({ s, waHref }: { s: Record<string, string>; waHref: string }) {
  return (
    <footer className="mt-20 border-t-4 border-brand bg-navy text-navy-soft">
      <div className="container-x grid gap-10 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <Emblem size={44} />
            <div><p className="text-lg font-bold text-white">{s.businessName}</p><p className="text-sm">{s.tagline}</p></div>
          </div>
          <p className="mt-4 text-sm">Eletricista em {s.city} – {s.state}. {s.hours}.</p>
        </div>
        <div>
          <p className="mb-3 font-bold uppercase tracking-wide text-white">Navegação</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/servicos" className="hover:text-white">Serviços</Link></li>
            <li><Link href="/portfolio" className="hover:text-white">Trabalhos realizados</Link></li>
            <li><Link href="/orcamento" className="hover:text-white">Pedir orçamento</Link></li>
            <li><Link href="/sistema" className="hover:text-white">Sistema de orçamentos para eletricistas</Link></li>
            <li><Link href="/privacidade" className="hover:text-white">Privacidade</Link> · <Link href="/termos" className="hover:text-white">Termos</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-bold uppercase tracking-wide text-white">Contato</p>
          <a href={waHref} target="_blank" rel="noopener" className="text-lg font-bold text-white hover:text-brand">WhatsApp: {fmtPhone(s.whatsapp)}</a>
          {s.email && <p className="mt-1 text-sm">{s.email}</p>}
          {s.instagram && <p className="mt-1 text-sm">Instagram: @{s.instagram.replace(/^@/, "")}</p>}
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} {s.businessName}</div>
    </footer>
  );
}
