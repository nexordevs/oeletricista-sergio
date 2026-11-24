import Link from "next/link";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { hasFeature } from "@/lib/access";
import { brl, fmtDate } from "@/lib/money";
import { Locked } from "@/components/panel/Locked";
import { EntryForm } from "./EntryForm";
import { SplitForm } from "@/components/panel/SplitForm";
import { deleteEntry } from "./actions";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function Financeiro(props: { searchParams: Promise<{ m?: string; aba?: string }> }) {
  const searchParams = await props.searchParams;
  const { user, access } = await panelContext();
  if (!hasFeature(access, "finance")) return <Locked feature="O controle financeiro" />;
  const now = new Date(Date.now() - 3 * 3600e3);
  const m = /^\d{4}-\d{2}$/.test(searchParams.m || "") ? searchParams.m! : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const [y, mo] = m.split("-").map(Number);
  const start = new Date(Date.UTC(y, mo - 1, 1, 3)), end = new Date(Date.UTC(y, mo, 1, 3));
  const prev = `${mo === 1 ? y - 1 : y}-${String(mo === 1 ? 12 : mo - 1).padStart(2, "0")}`, next = `${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, "0")}`;
  const [entries, approved] = await Promise.all([
    prisma.financeEntry.findMany({ where: { userId: user.id, date: { gte: start, lt: end } }, orderBy: { date: "desc" } }),
    prisma.quote.findMany({ where: { userId: user.id, status: "APPROVED", finance: { none: {} } }, orderBy: { decidedAt: "desc" }, take: 30 }),
  ]);
  const inc = entries.filter((e) => e.type === "INCOME").reduce((a, e) => a + Number(e.amount), 0);
  const exp = entries.filter((e) => e.type === "EXPENSE").reduce((a, e) => a + Number(e.amount), 0);
  const label = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const aba = searchParams.aba === "divisao" ? "divisao" : "lancamentos";
  const q = (extra: string) => `?m=${m}${extra}`;
  const tabs = (
    <nav className="flex gap-2" aria-label="Abas do financeiro">
      <Link href={q("")} className={`flex-1 rounded-xl px-4 py-3 text-center font-bold ${aba === "lancamentos" ? "bg-navy text-white" : "bg-white text-navy"}`}>Lançamentos</Link>
      <Link href={q("&aba=divisao")} className={`flex-1 rounded-xl px-4 py-3 text-center font-bold ${aba === "divisao" ? "bg-navy text-white" : "bg-white text-navy"}`}>Divisão por serviço</Link>
    </nav>
  );
  const nav = <div className="flex items-center justify-between rounded-xl bg-white p-2"><Link href={`?m=${prev}${aba === "divisao" ? "&aba=divisao" : ""}`} className="btn-ghost btn-sm">← Anterior</Link><b className="capitalize text-navy">{label}</b><Link href={`?m=${next}${aba === "divisao" ? "&aba=divisao" : ""}`} className="btn-ghost btn-sm">Próximo →</Link></div>;

  if (aba === "divisao") {
    const quotes = await prisma.quote.findMany({ where: { userId: user.id, status: "APPROVED", decidedAt: { gte: start, lt: end } }, orderBy: { decidedAt: "desc" } });
    const sum = (f: (x: (typeof quotes)[number]) => number) => quotes.reduce((a, x) => a + f(x), 0);
    const tot = sum((x) => Number(x.total)), helper = sum((x) => Number(x.helperAmount)), mat = sum((x) => Number(x.materialCost));
    return (
      <div className="space-y-4">
        {tabs}{nav}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="card"><p className="text-xs font-bold uppercase text-muted">Aprovado no mês</p><p className="text-xl font-bold text-navy">{brl(tot)}</p></div>
          <div className="card"><p className="text-xs font-bold uppercase text-muted">Pago a ajudantes</p><p className="text-xl font-bold text-red-700">{brl(helper)}</p></div>
          <div className="card"><p className="text-xs font-bold uppercase text-muted">Material</p><p className="text-xl font-bold text-red-700">{brl(mat)}</p></div>
          <div className="card border-l-4 border-l-brand bg-navy text-white"><p className="text-xs font-bold uppercase text-navy-soft">Ficou pra você</p><p className="text-xl font-bold text-brand">{brl(tot - helper - mat)}</p></div>
        </div>
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-muted">Para cada orçamento aprovado, informe quanto foi para o ajudante e o custo do material. As saídas entram sozinhas em “Lançamentos”. 🔒 O cliente nunca vê.</p>
        {quotes.length === 0 ? <div className="card text-center text-muted">Nenhum orçamento aprovado neste mês.</div> : quotes.map((x) => {
          const own = Number(x.total) - Number(x.helperAmount) - Number(x.materialCost);
          const filled = Number(x.helperAmount) > 0 || Number(x.materialCost) > 0;
          return (
            <details key={x.id} className="card p-0" open={!filled && quotes.length <= 3}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-4">
                <span><b className="block text-navy">#{String(x.number).padStart(3, "0")} · {x.clientName}</b><span className="text-xs text-muted">{fmtDate(x.decidedAt)} · total {brl(x.total)}{x.helperName ? ` · ajudante: ${x.helperName}` : ""}</span></span>
                <span className="text-right text-sm">{filled ? <><span className="block text-xs text-muted">ficou pra você</span><b className="text-green-700">{brl(own)}</b></> : <span className="badge bg-brand text-navy">Preencher divisão</span>}</span>
              </summary>
              <div className="border-t border-line p-5"><SplitForm id={x.id} total={Number(x.total)} helperName={x.helperName} helperAmount={Number(x.helperAmount)} materialCost={Number(x.materialCost)} approved compact /></div>
            </details>
          );
        })}
      </div>
    );
  }
  return (
    <div className="space-y-4">
    {tabs}
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {nav}
        <div className="grid grid-cols-3 gap-3">
          <div className="card"><p className="text-xs font-bold uppercase text-muted">Entradas</p><p className="text-xl font-bold text-green-700">{brl(inc)}</p></div>
          <div className="card"><p className="text-xs font-bold uppercase text-muted">Saídas</p><p className="text-xl font-bold text-red-700">{brl(exp)}</p></div>
          <div className="card border-l-4 border-l-brand"><p className="text-xs font-bold uppercase text-muted">Saldo</p><p className="text-xl font-bold text-navy">{brl(inc - exp)}</p></div>
        </div>
        {entries.length === 0 ? <div className="card text-center text-muted">Nenhum lançamento neste mês.</div> : (
          <ul className="card divide-y divide-line p-0">{entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <span><b className="block text-navy">{e.description}</b><span className="text-xs text-muted">{fmtDate(e.date)}{e.auto && <span className="badge ml-2 bg-light text-navy">{e.autoKind === "ajudante" ? "ajudante" : e.autoKind === "material" ? "material" : "automático"}</span>}</span></span>
              <span className="flex items-center gap-3"><b className={e.type === "INCOME" ? "text-green-700" : "text-red-700"}>{e.type === "INCOME" ? "+" : "−"} {brl(e.amount)}</b>
                <form action={deleteEntry}><input type="hidden" name="id" value={e.id} /><ConfirmButton message="Excluir lançamento?" className="text-xs font-bold text-muted hover:text-red-700">Excluir</ConfirmButton></form></span>
            </li>))}
          </ul>
        )}
      </div>
      <aside className="card h-fit"><p className="mb-3 text-lg font-bold text-navy">Novo lançamento</p>
        <EntryForm today={new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)} quotes={approved.map((q) => ({ id: q.id, label: `#${String(q.number).padStart(3, "0")} ${q.clientName}`, total: Number(q.total).toFixed(2).replace(".", ",") }))} />
      </aside>
    </div>
    </div>
  );
}
