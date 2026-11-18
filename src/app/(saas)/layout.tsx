import Link from "next/link";
import { Logo } from "@/components/Logo";

// Área comercial do sistema (para eletricistas) — separada do site de atendimento a clientes.
export default function SaasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b-[3px] border-brand bg-navy">
        <div className="container-x flex h-[68px] items-center justify-between gap-3">
          <Link href="/sistema" className="flex items-center gap-3" aria-label="Sistema de orçamentos">
            <Logo dark size={36} />
            <span className="hidden rounded-md bg-white/10 px-2 py-1 text-xs font-bold uppercase tracking-wide text-navy-soft sm:inline">Sistema de orçamentos</span>
          </Link>
          <nav className="flex items-center gap-1">
            <a href="#planos" className="hidden rounded-lg px-3 py-2 text-[15px] font-bold text-navy-soft hover:text-white sm:inline">Planos</a>
            <Link href="/entrar" className="rounded-lg px-3 py-2 text-[15px] font-bold text-navy-soft hover:text-white">Entrar</Link>
            <Link href="/cadastro" className="btn-primary px-4 py-2.5">Criar conta</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-20 bg-navy text-navy-soft">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-sm sm:flex-row">
          <span>Sistema de orçamentos para eletricistas</span>
          <span className="flex gap-4"><Link href="/termos" className="hover:text-white">Termos</Link><Link href="/privacidade" className="hover:text-white">Privacidade</Link><Link href="/" className="hover:text-white">Precisa de um eletricista?</Link></span>
        </div>
      </footer>
    </>
  );
}
