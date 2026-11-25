import Link from "next/link";
import { Emblem } from "./Logo";
import { fmtPhone } from "@/lib/money";
import { ReviewButton } from "./site/ReviewButton";
import { IconWhatsApp, IconMap } from "./icons";

const IgIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
);

export function SiteFooter({ s, waHref }: { s: Record<string, string>; waHref: string }) {
  const ig = s.instagram?.replace(/^@/, "");
  return (
    <footer className="mt-20 border-t-4 border-brand bg-navy text-navy-soft">
      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3">
            <Emblem size={48} />
            <div><p className="text-lg font-bold text-white">{s.businessName}</p><p className="text-sm">{s.tagline}</p></div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">Eletricista em {s.city} – {s.state} e região. Serviço no padrão NBR 5410 e NR-10, com orçamento por escrito.</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-navy">⚡ {s.attendance}</p>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-brand">Navegue</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[15px] sm:grid-cols-1">
            <li><Link href="/servicos" className="hover:text-white">Serviços</Link></li>
            <li><Link href="/portfolio" className="hover:text-white">Trabalhos</Link></li>
            <li><Link href="/#depoimentos" className="hover:text-white">Avaliações</Link></li>
            <li><Link href="/#duvidas" className="hover:text-white">Dúvidas</Link></li>
            <li><Link href="/orcamento" className="font-bold text-white hover:text-brand">Pedir orçamento</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-brand">Fale comigo</p>
          <ul className="space-y-3 text-[15px]">
            <li><a href={waHref} target="_blank" rel="noopener" className="flex items-center gap-3 font-bold text-white hover:text-brand"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1FAF38] text-white"><IconWhatsApp className="h-5 w-5" /></span>{fmtPhone(s.whatsapp)}</a></li>
            {ig && <li><a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener" className="flex items-center gap-3 hover:text-white"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white"><IgIcon /></span>@{ig}</a></li>}
            <li className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white"><IconMap className="h-5 w-5" /></span>{s.city} – {s.state} e região</li>
          </ul>
          <ReviewButton url={s.googleReviewUrl} className="btn mt-5 w-full border-2 border-white/20 py-2.5 text-white hover:border-brand sm:w-auto" label="Avalie meu serviço no Google" />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-4 text-center text-xs sm:flex-row sm:text-left">
          <span>© {new Date().getFullYear()} {s.businessName} · <Link href="/privacidade" className="hover:text-white">Privacidade</Link> · <Link href="/termos" className="hover:text-white">Termos</Link></span>
          <Link href="/sistema" className="hover:text-white">É eletricista? Conheça o sistema de orçamentos →</Link>
        </div>
      </div>
      <div className="h-[76px] md:hidden" aria-hidden />
    </footer>
  );
}
