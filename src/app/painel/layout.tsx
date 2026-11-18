import Link from "next/link";
import { Shell, type NavItem } from "@/components/panel/Shell";
import { panelContext } from "@/lib/panel";
import { hasFeature } from "@/lib/access";
import { logout } from "@/app/(auth)/actions";
import { fmtDate } from "@/lib/money";
import { IconHome, IconPlus, IconFile, IconUsers, IconList, IconPalette, IconMoney, IconChart, IconCard, IconSettings } from "@/components/icons";

export const metadata = { title: "Painel", robots: { index: false } };
export const dynamic = "force-dynamic";

const titles: [string, string][] = [
  ["/painel/orcamentos/novo", "Novo orçamento"], ["/painel/orcamentos", "Orçamentos"], ["/painel/clientes", "Clientes"],
  ["/painel/servicos", "Meus serviços e preços"], ["/painel/marca", "Minha marca"], ["/painel/financeiro", "Financeiro"],
  ["/painel/relatorios", "Relatórios"], ["/painel/assinatura", "Minha assinatura"], ["/painel/conta", "Minha conta"], ["/painel", "Início"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, access } = await panelContext();
  const nav: NavItem[] = [
    { href: "/painel", label: "Início", icon: <IconHome />, exact: true },
    { href: "/painel/orcamentos/novo", label: "Novo orçamento", icon: <IconPlus />, exact: true },
    { href: "/painel/orcamentos", label: "Orçamentos", icon: <IconFile /> },
    { href: "/painel/clientes", label: "Clientes", icon: <IconUsers /> },
    { href: "/painel/servicos", label: "Serviços e preços", icon: <IconList /> },
    { href: "/painel/marca", label: "Minha marca", icon: <IconPalette /> },
    { href: "/painel/financeiro", label: "Financeiro", icon: <IconMoney />, locked: !hasFeature(access, "finance") },
    { href: "/painel/relatorios", label: "Relatórios", icon: <IconChart />, locked: !hasFeature(access, "reports") },
    { href: "/painel/assinatura", label: "Assinatura", icon: <IconCard /> },
    { href: "/painel/conta", label: "Minha conta", icon: <IconSettings /> },
    ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Administração", icon: <IconSettings /> }] : []),
  ];
  const mobileNav: NavItem[] = [
    { href: "/painel", label: "Início", icon: <IconHome className="h-5 w-5" />, exact: true },
    { href: "/painel/orcamentos/novo", label: "Novo", icon: <IconPlus className="h-5 w-5" />, exact: true },
    { href: "/painel/orcamentos", label: "Orçamentos", icon: <IconFile className="h-5 w-5" /> },
    { href: "/painel/clientes", label: "Clientes", icon: <IconUsers className="h-5 w-5" /> },
  ];
  const banner = !access.active ? (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border-2 border-brand bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-bold text-navy">Sua assinatura não está ativa. Assine um plano para criar e enviar orçamentos.</p>
      <Link href="/painel/assinatura" className="btn-primary btn-sm shrink-0">Ver planos</Link>
    </div>
  ) : access.source === "manual" && access.until ? (
    <p className="mb-4 rounded-xl bg-white px-4 py-2 text-sm text-muted">Acesso liberado pela administração até <b>{fmtDate(access.until)}</b>.</p>
  ) : null;
  return <Shell nav={nav} mobileNav={mobileNav} user={user.name} titles={titles} logout={logout} banner={banner}>{children}</Shell>;
}
