import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { IconWhatsApp } from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { waLink } from "@/lib/money";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const wa = waLink(s.whatsapp, "Olá! Vim pelo site e gostaria de um orçamento.");
  return (
    <>
      <SiteHeader waHref={wa} />
      <main>{children}</main>
      <SiteFooter s={s} waHref={wa} />
      <a href={wa} target="_blank" rel="noopener" aria-label="Conversar no WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1FAF38] text-white shadow-lg ring-4 ring-white transition hover:scale-105">
        <IconWhatsApp className="h-7 w-7" />
      </a>
    </>
  );
}
