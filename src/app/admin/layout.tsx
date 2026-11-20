import { Shell, type NavItem } from "@/components/panel/Shell";
import { AutoRefresh } from "@/components/AutoRefresh";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { IconHome, IconUsers, IconCard, IconList, IconInbox, IconImage, IconStar, IconSettings, IconBolt, IconFile, IconPlay } from "@/components/icons";

export const metadata = { title: "Administração", robots: { index: false } };
export const dynamic = "force-dynamic";
const titles: [string, string][] = [["/admin/usuarios", "Usuários"], ["/admin/pagamentos", "Pagamentos"], ["/admin/planos", "Planos"], ["/admin/aulas", "Videoaulas"], ["/admin/biblioteca", "Biblioteca de serviços"], ["/admin/solicitacoes", "Solicitações do site"], ["/admin/portfolio", "Portfólio"], ["/admin/servicos", "Serviços anunciados"], ["/admin/depoimentos", "Depoimentos"], ["/admin/site", "Textos e informações do site"], ["/admin", "Visão geral"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireAdmin();
  const nav: NavItem[] = [
    { href: "/admin", label: "Visão geral", icon: <IconHome />, exact: true },
    { href: "/admin/usuarios", label: "Usuários", icon: <IconUsers /> },
    { href: "/admin/pagamentos", label: "Pagamentos", icon: <IconCard /> },
    { href: "/admin/planos", label: "Planos", icon: <IconFile /> },
    { href: "/admin/biblioteca", label: "Biblioteca de serviços", icon: <IconList /> },
    { href: "/admin/aulas", label: "Videoaulas", icon: <IconPlay /> },
    { href: "/admin/solicitacoes", label: "Solicitações do site", icon: <IconInbox /> },
    { href: "/admin/portfolio", label: "Portfólio (fotos)", icon: <IconImage /> },
    { href: "/admin/servicos", label: "Serviços anunciados", icon: <IconBolt /> },
    { href: "/admin/depoimentos", label: "Depoimentos", icon: <IconStar /> },
    { href: "/admin/site", label: "Textos do site", icon: <IconSettings /> },
    { href: "/painel", label: "Meu painel de orçamentos", icon: <IconFile /> },
  ];
  const mobileNav: NavItem[] = [
    { href: "/admin", label: "Geral", icon: <IconHome className="h-5 w-5" />, exact: true },
    { href: "/admin/usuarios", label: "Usuários", icon: <IconUsers className="h-5 w-5" /> },
    { href: "/admin/solicitacoes", label: "Pedidos", icon: <IconInbox className="h-5 w-5" /> },
    { href: "/admin/site", label: "Site", icon: <IconSettings className="h-5 w-5" /> },
  ];
  return <Shell nav={nav} mobileNav={mobileNav} user={u.name} titles={titles} logout={logout}><AutoRefresh seconds={30} />{children}</Shell>;
}
