import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { hasFeature } from "@/lib/access";
import { brl, fmtDate, waLink } from "@/lib/money";
import { StatusBadge } from "@/lib/quote-status";
import { ClientForm } from "../ClientForm";
import { deleteClient } from "../actions";
import { IconPlus, IconWhatsApp } from "@/components/icons";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function Cliente({ params }: { params: { id: string } }) {
  const { user, access } = await panelContext();
  const c = await prisma.client.findFirst({ where: { id: params.id, userId: user.id } });
  if (!c) notFound();
  const history = hasFeature(access, "clientHistory");
  const quotes = history ? await prisma.quote.findMany({ where: { userId: user.id, clientId: c.id }, orderBy: { createdAt: "desc" } }) : [];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-4">
        <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xl font-bold text-navy">{c.name}</p><p className="text-sm text-muted">Cliente desde {fmtDate(c.createdAt)}</p></div>
          <div className="flex gap-2">
            {c.phone && <a href={waLink(c.phone)} target="_blank" rel="noopener" className="btn-wa btn-sm"><IconWhatsApp className="h-4 w-4" /> WhatsApp</a>}
            <Link href={`/painel/orcamentos/novo?cliente=${c.id}`} className="btn-primary btn-sm"><IconPlus className="h-4 w-4" /> Orçamento</Link>
          </div>
        </div>
        <div className="card p-0">
          <p className="px-5 py-4 font-bold text-navy">Histórico de orçamentos</p>
          {!history ? (
            <p className="px-5 pb-5 text-sm text-muted">O histórico por cliente está disponível no <Link href="/painel/assinatura" className="font-bold text-navy underline">plano Profissional</Link>.</p>
          ) : quotes.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">Nenhum orçamento para este cliente ainda.</p>
          ) : (
            <ul className="divide-y divide-line">{quotes.map((q) => (
              <li key={q.id}><Link href={`/painel/orcamentos/${q.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-light">
                <span><b className="text-navy">#{String(q.number).padStart(3, "0")}</b> <span className="text-sm text-muted">{fmtDate(q.createdAt)}</span></span>
                <span className="flex items-center gap-3"><b>{brl(q.total)}</b><StatusBadge s={q.status} /></span>
              </Link></li>))}
            </ul>
          )}
        </div>
      </section>
      <aside className="card h-fit space-y-4">
        <p className="text-lg font-bold text-navy">Dados do cliente</p>
        <ClientForm c={c} />
        <form action={deleteClient}><input type="hidden" name="id" value={c.id} /><ConfirmButton message="Excluir este cliente? Os orçamentos dele continuam salvos." className="btn-danger btn-sm w-full">Excluir cliente</ConfirmButton></form>
      </aside>
    </div>
  );
}
