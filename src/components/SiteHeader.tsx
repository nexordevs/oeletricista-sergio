"use client";
// Topo do site do cliente: menu limpo no computador e tela cheia organizada no celular.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { IconMenu, IconX, IconWhatsApp, IconBolt, IconImage, IconStar, IconFile } from "./icons";

const links = [
  { href: "/servicos", label: "Serviços", icon: IconBolt },
  { href: "/portfolio", label: "Trabalhos", icon: IconImage },
  { href: "/#depoimentos", label: "Avaliações", icon: IconStar },
  { href: "/#duvidas", label: "Dúvidas", icon: IconFile },
];

export function SiteHeader({ waHref, phone, emergency }: { waHref: string; phone: string; emergency: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const isActive = (h: string) => !h.includes("#") && (path === h || path.startsWith(h + "/"));
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-brand bg-navy">
      <div className="container-x flex h-[68px] items-center justify-between gap-4">
        <Link href="/" aria-label="Página inicial" className="shrink-0"><Logo dark size={40} /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Menu principal">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined}
              className={`relative rounded-lg px-3 py-2 text-[15px] font-bold transition ${isActive(l.href) ? "text-white after:absolute after:inset-x-3 after:-bottom-[15px] after:h-[3px] after:rounded after:bg-brand" : "text-navy-soft hover:text-white"}`}>{l.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/orcamento" className="btn border-2 border-white/25 px-4 py-2 text-white hover:border-brand">Pedir orçamento</Link>
          <a href={waHref} target="_blank" rel="noopener" className="btn-primary px-4 py-2.5"><IconWhatsApp /> WhatsApp</a>
        </div>
        <button className="-mr-2 rounded-lg p-2 text-white md:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}><IconMenu className="h-7 w-7" /></button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-navy md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-[68px] shrink-0 items-center justify-between border-b-[3px] border-brand px-4">
            <Link href="/" onClick={() => setOpen(false)} aria-label="Página inicial"><Logo dark size={40} /></Link>
            <button onClick={() => setOpen(false)} className="-mr-2 rounded-lg p-2 text-white" aria-label="Fechar menu"><IconX className="h-7 w-7" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <nav className="overflow-hidden rounded-2xl bg-white/5" aria-label="Menu principal">
              {links.map((l, i) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-4 text-lg font-bold ${i ? "border-t border-white/10" : ""} ${isActive(l.href) ? "text-brand" : "text-white"}`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-brand"><l.icon className="h-5 w-5" /></span>
                  <span className="flex-1">{l.label}</span><span aria-hidden className="text-navy-soft">›</span>
                </Link>
              ))}
            </nav>
            <div className="mt-5 space-y-3">
              <a href={waHref} target="_blank" rel="noopener" className="btn-wa w-full py-4 text-base"><IconWhatsApp /> Chamar no WhatsApp</a>
              <Link href="/orcamento" onClick={() => setOpen(false)} className="btn-primary w-full py-4 text-base">Pedir orçamento</Link>
            </div>
            <div className="mt-5 rounded-2xl border-2 border-brand/50 p-4 text-white">
              <p className="font-bold">⚡ {emergency}</p>
              <p className="mt-1 text-sm text-navy-soft">Falta de energia, curto-circuito ou cheiro de queimado? Me chama: <b className="text-white">{phone}</b></p>
            </div>
          </div>
          <div className="shrink-0 border-t border-white/10 px-4 py-4 text-center text-sm">
            <Link href="/sistema" onClick={() => setOpen(false)} className="font-bold text-navy-soft hover:text-white">É eletricista? Conheça o sistema de orçamentos →</Link>
          </div>
        </div>
      )}
    </header>
  );
}
