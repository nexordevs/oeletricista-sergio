import { quoteSubject } from "@/lib/quote-title";
import Link from "next/link";
import type { Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { expireQuotes } from "@/lib/quotes";
import { brl, fmtDate } from "@/lib/money";
import { STATUS, StatusBadge } from "@/lib/quote-status";
import { IconPlus, IconFile } from "@/components/icons";

type SP = { q?: string; status?: string; de?: string; ate?: string; servico?: string };
const validDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

export default async function Lista(props: { searchParams: Promise<SP> }) {
  const sp = await props.searchParams;
  const { user } = await panelContext();
  await expireQuotes(user.id);
  const where: Prisma.QuoteWhereInput = { userId: user.id };
  if (sp.q) where.clientName = { contains: sp.q.slice(0, 80), mode: "insensitive" };
  if (sp.status && sp.status in STATUS) where.status = sp.status as QuoteStatus;
  const de = validDate(sp.de), ate = validDate(sp.ate);
  if (de || ate) where.createdAt = { ...(de ? { gte: new Date(de + "T00:00:00-03:00") } : {}), ...(ate ? { lte: new Date(ate + "T23:59:59-03:00") } : {}) };
  if (sp.servico) where.items = { some: { description: { contains: sp.servico.slice(0, 80), mode: "insensitive" } } };
  const quotes = await prisma.quote.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  const filtering = Object.values(sp).some(Boolean);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Link href="/painel/orcamentos/novo" className="btn-primary"><IconPlus /> Novo orçamento</Link></div>
      <details className="card" open={filtering}>
        <summary className="cursor-pointer font-bold text-navy">Filtrar orçamentos</summary>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input name="q" defaultValue={sp.q} placeholder="Cliente" className="input" aria-label="Cliente" />
          <input name="servico" defaultValue={sp.servico} placeholder="Serviço / item" className="input" aria-label="Serviço" />
          <select name="status" defaultValue={sp.status || ""} className="input" aria-label="Status"><option value="">Todos os status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <div className="grid grid-cols-2 gap-2 lg:col-span-2"><input type="date" name="de" defaultValue={de} className="input" aria-label="De" /><input type="date" name="ate" defaultValue={ate} className="input" aria-label="Até" /></div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5"><button className="btn-navy btn-sm">Aplicar filtros</button>{filtering && <Link href="/painel/orcamentos" className="btn-ghost btn-sm">Limpar</Link>}</div>
        </form>
      </details>
      {quotes.length === 0 ? (
        <div className="card text-center"><IconFile className="mx-auto h-10 w-10 text-muted" /><p className="mt-2 font-bold text-navy">{filtering ? "Nenhum orçamento com esses filtros." : "Nenhum orçamento ainda."}</p>{!filtering && <Link href="/painel/orcamentos/novo" className="btn-primary mt-4">Criar o primeiro</Link>}</div>
      ) : (
        <ul className="card divide-y divide-line p-0">
          {quotes.map((q) => (
            <li key={q.id}><Link href={`/painel/orcamentos/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-light">
              <span className="min-w-0"><span className="block truncate font-bold text-navy">#{String(q.number).padStart(3, "0")} · {q.clientName}</span><span className="block truncate text-xs text-muted">{fmtDate(q.createdAt)}{quoteSubject(q.title) ? ` · ${quoteSubject(q.title)}` : ""}</span></span>
              <span className="flex shrink-0 flex-col items-end gap-1"><b>{brl(q.total)}</b><StatusBadge s={q.status} /></span>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
