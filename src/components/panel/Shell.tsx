"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { IconMenu, IconX, IconLogout } from "@/components/icons";
import { usePanelTitle } from "./PageTitle";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Theme } from "@/lib/theme";

export type NavItem = { href: string; label: string; icon: React.ReactNode; locked?: boolean; exact?: boolean; group?: string };

export function Shell({ nav, mobileNav, user, titles, children, logout, banner, theme = "light" }: { nav: NavItem[]; mobileNav: NavItem[]; user: string; titles: [string, string][]; children: React.ReactNode; logout: () => Promise<void>; banner?: React.ReactNode; theme?: Theme }) {
  const path = usePathname();
  const title = usePanelTitle(titles, "Painel");
  const [open, setOpen] = useState(false);
  const active = (n: NavItem) => (n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/"));
  const links = (
    <nav className="flex flex-col gap-0.5 p-3">
      {nav.map((n, i) => (
        <div key={n.href}>
          {n.group && n.group !== nav[i - 1]?.group && <p className={`px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand/80 ${i > 0 ? "mt-4 border-t border-white/10 pt-4" : "pt-1"}`}>{n.group}</p>}
          <Link href={n.href} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-bold transition [&_svg]:h-[18px] [&_svg]:w-[18px] ${active(n) ? "bg-brand text-navy" : "text-navy-soft hover:bg-white/5 hover:text-white"}`}>
            {n.icon}<span className="flex-1">{n.label}</span>{n.locked && <span className="badge bg-white/10 text-[10px] text-navy-soft">PLANO</span>}
          </Link>
        </div>
      ))}
    </nav>
  );
  return (
    <div data-theme-root data-theme={theme} className="min-h-screen bg-light lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r-4 border-brand bg-navy lg:flex">
        <div className="px-5 py-5"><Logo dark size={36} /></div>
        <div className="flex-1 overflow-y-auto">{links}</div>
        <div className="border-t border-white/10 p-4">
          <ThemeToggle initial={theme} onDark compact />
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-white"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-navy">{user.trim().charAt(0).toUpperCase()}</span><span className="truncate">{user}</span></p>
            <form action={logout}><button className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-navy-soft hover:bg-white/5 hover:text-white"><IconLogout className="h-4 w-4" /> Sair</button></form>
          </div>
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b-[3px] border-brand bg-navy px-4 lg:hidden">
        <Logo dark size={30} />
        <button onClick={() => setOpen(true)} className="p-1 text-white" aria-label="Abrir menu"><IconMenu className="h-7 w-7" /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 flex-col bg-navy">
            <div className="flex items-center justify-between p-4"><span className="truncate font-bold text-white">{user}</span><button onClick={() => setOpen(false)} className="text-white" aria-label="Fechar"><IconX className="h-7 w-7" /></button></div>
            <div className="flex-1 overflow-y-auto">{links}</div>
            <div className="border-t border-white/10 p-4"><ThemeToggle initial={theme} onDark /></div>
            <form action={logout} className="border-t border-white/10 p-4"><button className="flex items-center gap-2 font-bold text-navy-soft"><IconLogout className="h-4 w-4" /> Sair</button></form>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
        {banner}
        <h1 className="mb-5 text-2xl font-bold text-navy">{title}</h1>
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {mobileNav.map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${active(n) ? "text-navy" : "text-muted"}`}>
            <span className={`rounded-full px-3 py-1 ${active(n) ? "bg-brand" : ""}`}>{n.icon}</span>{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
