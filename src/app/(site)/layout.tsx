import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { IconWhatsApp } from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { waLink, fmtPhone } from "@/lib/money";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const wa = waLink(s.whatsapp, "Olá! Vim pelo site e gostaria de um orçamento.");
  return (
    <>
      <SiteHeader waHref={wa} phone={fmtPhone(s.whatsapp)} emergency={s.attendance} />
      <main>{children}</main>
      <SiteFooter s={s} waHref={wa} />
      {/* computador: botão flutuante · celular: barra fixa com as duas ações */}
      <a href={wa} target="_blank" rel="noopener" aria-label="Conversar no WhatsApp"
        className="fixed bottom-5 right-5 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-[#1FAF38] text-white shadow-lg ring-4 ring-white transition hover:scale-105 md:flex">
        <IconWhatsApp className="h-7 w-7" />
      </a>
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-line bg-white/95 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur md:hidden">
        <a href={wa} target="_blank" rel="noopener" className="btn-wa py-3"><IconWhatsApp /> WhatsApp</a>
        <Link href="/orcamento" className="btn-primary py-3">Pedir orçamento</Link>
      </div>
    </>
  );
}
