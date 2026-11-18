"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";
import { IconMenu, IconX, IconWhatsApp } from "./icons";

const links = [
  { href: "/servicos", label: "Serviços" },
  { href: "/portfolio", label: "Trabalhos" },
  { href: "/#depoimentos", label: "Depoimentos" },
  { href: "/orcamento", label: "Pedir orçamento" },
  { href: "/sistema", label: "Para eletricistas" },
];

export function SiteHeader({ waHref }: { waHref: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-brand bg-navy">
      <div className="container-x flex h-[68px] items-center justify-between">
        <Link href="/" aria-label="Página inicial"><Logo dark size={40} /></Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-[15px] font-bold text-navy-soft hover:text-white">{l.label}</Link>
          ))}
          <a href={waHref} target="_blank" rel="noopener" className="btn-primary ml-2 py-2.5"><IconWhatsApp /> WhatsApp</a>
          <Link href="/entrar" className="ml-1 rounded-lg px-3 py-2 text-sm font-bold text-navy-soft hover:text-white">Entrar</Link>
        </nav>
        <button className="rounded-lg p-2 text-white lg:hidden" onClick={() => setOpen(!open)} aria-label="Abrir menu" aria-expanded={open}>
          {open ? <IconX className="h-7 w-7" /> : <IconMenu className="h-7 w-7" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/10 bg-navy lg:hidden">
          <div className="container-x flex flex-col py-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 text-lg font-bold text-white">{l.label}</Link>
            ))}
            <Link href="/entrar" onClick={() => setOpen(false)} className="py-3 text-lg font-bold text-navy-soft">Entrar no sistema</Link>
            <a href={waHref} target="_blank" rel="noopener" className="btn-primary my-3"><IconWhatsApp /> Chamar no WhatsApp</a>
          </div>
        </nav>
      )}
    </header>
  );
}
