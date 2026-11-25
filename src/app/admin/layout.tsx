import { getTheme } from "@/lib/theme";
import { Shell, type NavItem } from "@/components/panel/Shell";
import { AutoRefresh } from "@/components/AutoRefresh";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { IconHome, IconUsers, IconCard, IconList, IconInbox, IconImage, IconStar, IconSettings, IconBolt, IconFile, IconPlay, IconBook } from "@/components/icons";

export const metadata = { title: "Administração", robots: { index: false } };
export const dynamic = "force-dynamic";
const titles: [string, string][] = [["/admin/mentoria", "Mentoria de estudos"], ["/admin/usuarios", "Usuários"], ["/admin/pagamentos", "Pagamentos"], ["/admin/planos", "Planos"], ["/admin/aulas", "Videoaulas"], ["/admin/biblioteca", "Biblioteca de serviços"], ["/admin/solicitacoes", "Solicitações do site"], ["/admin/portfolio", "Portfólio"], ["/admin/servicos", "Serviços anunciados"], ["/admin/depoimentos", "Depoimentos"], ["/admin/site", "Textos e informações do site"], ["/admin", "Visão geral"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireAdmin();
  // menu em grupos: estudos, assinantes do sistema, site e o próprio painel de orçamentos
  const nav: NavItem[] = [
    { href: "/admin", label: "Visão geral", icon: <IconHome />, exact: true },
    { href: "/admin/mentoria", label: "Mentoria PMPB", icon: <IconBook />, group: "Estudos" },
    { href: "/admin/usuarios", label: "Usuários", icon: <IconUsers />, group: "Assinantes" },
    { href: "/admin/pagamentos", label: "Pagamentos", icon: <IconCard />, group: "Assinantes" },
    { href: "/admin/planos", label: "Planos", icon: <IconFile />, group: "Assinantes" },
    { href: "/admin/biblioteca", label: "Biblioteca de preços", icon: <IconList />, group: "Assinantes" },
    { href: "/admin/aulas", label: "Videoaulas", icon: <IconPlay />, group: "Assinantes" },
    { href: "/admin/solicitacoes", label: "Pedidos de orçamento", icon: <IconInbox />, group: "Meu site" },
    { href: "/admin/portfolio", label: "Portfólio", icon: <IconImage />, group: "Meu site" },
    { href: "/admin/servicos", label: "Serviços", icon: <IconBolt />, group: "Meu site" },
    { href: "/admin/depoimentos", label: "Depoimentos", icon: <IconStar />, group: "Meu site" },
    { href: "/admin/site", label: "Textos e contatos", icon: <IconSettings />, group: "Meu site" },
    { href: "/painel", label: "Painel de orçamentos", icon: <IconFile />, group: "Meu trabalho" },
  ];

  const mobileNav: NavItem[] = [
    { href: "/admin", label: "Geral", icon: <IconHome className="h-5 w-5" />, exact: true },
    { href: "/admin/usuarios", label: "Usuários", icon: <IconUsers className="h-5 w-5" /> },
    { href: "/admin/solicitacoes", label: "Pedidos", icon: <IconInbox className="h-5 w-5" /> },
    { href: "/admin/mentoria", label: "Estudos", icon: <IconBook className="h-5 w-5" /> },
  ];
  return <Shell nav={nav} mobileNav={mobileNav} user={u.name} titles={titles} logout={logout} theme={await getTheme()}><AutoRefresh seconds={30} />{children}</Shell>;
}
