import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { hasFeature } from "@/lib/access";
import { expireQuotes } from "@/lib/quotes";
import { brl } from "@/lib/money";
import { STATUS } from "@/lib/quote-status";
import { Locked } from "@/components/panel/Locked";

export default async function Relatorios() {
  const { user, access } = await panelContext();
  if (!hasFeature(access, "reports")) return <Locked feature="Relatórios e indicadores" />;
  await expireQuotes(user.id);
  const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0, 0, 0, 0);
  const [quotes, top] = await Promise.all([
    prisma.quote.findMany({ where: { userId: user.id, status: { not: "DRAFT" } }, select: { status: true, total: true, helperAmount: true, materialCost: true, createdAt: true, issuedAt: true, decidedAt: true } }),
    prisma.quoteItem.groupBy({ by: ["description"], where: { quote: { userId: user.id, status: "APPROVED" }, kind: "SERVICE" }, _sum: { total: true }, _count: true, orderBy: { _sum: { total: "desc" } }, take: 8 }),
  ]);
  const decided = quotes.filter((q) => ["APPROVED", "REJECTED", "EXPIRED"].includes(q.status));
  const approved = quotes.filter((q) => q.status === "APPROVED");
  const conv = decided.length ? (approved.length / decided.length) * 100 : 0;
  const ticket = approved.length ? approved.reduce((a, q) => a + Number(q.total), 0) / approved.length : 0;
  const days = approved.filter((q) => q.issuedAt && q.decidedAt).map((q) => (+q.decidedAt! - +q.issuedAt!) / 864e5);
  const avgDays = days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0;
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(since); d.setMonth(since.getMonth() + i); return d; });
  const series = months.map((d) => {
    const inM = (x: Date | null) => x && x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear();
    return { label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), quoted: quotes.filter((q) => inM(q.createdAt)).reduce((a, q) => a + Number(q.total), 0), won: approved.filter((q) => inM(q.decidedAt)).reduce((a, q) => a + Number(q.total), 0) };
  });
  const max = Math.max(1, ...series.map((s) => s.quoted));
  const byStatus = Object.keys(STATUS).filter((k) => k !== "DRAFT").map((k) => ({ k, n: quotes.filter((q) => q.status === k).length }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Taxa de aprovação" value={`${conv.toFixed(0)}%`} sub={`${approved.length} de ${decided.length} decididos`} />
        <Kpi label="Ticket médio aprovado" value={brl(ticket)} />
        <Kpi label="Tempo médio até aprovar" value={`${avgDays.toFixed(1)} dias`} />
        <Kpi label="Total aprovado" value={brl(approved.reduce((a, q) => a + Number(q.total), 0))} sub={`ficou pra você: ${brl(approved.reduce((a, q) => a + Number(q.total) - Number(q.helperAmount) - Number(q.materialCost), 0))}`} />
      </div>
      <section className="card">
        <p className="font-bold text-navy">Últimos 6 meses</p>
        <div className="mt-2 flex gap-4 text-xs"><span className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-navy" />Orçado</span><span className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-brand" />Aprovado</span></div>
        <div className="mt-4 flex h-56 items-end gap-3" role="img" aria-label="Gráfico de valores orçados e aprovados por mês">
          {series.map((s) => (
            <div key={s.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div className="w-1/2 max-w-8 rounded-t bg-navy" style={{ height: `${(s.quoted / max) * 100}%` }} title={`Orçado: ${brl(s.quoted)}`} />
                <div className="w-1/2 max-w-8 rounded-t bg-brand" style={{ height: `${(s.won / max) * 100}%` }} title={`Aprovado: ${brl(s.won)}`} />
              </div>
              <span className="text-xs font-bold capitalize text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card"><p className="mb-3 font-bold text-navy">Orçamentos por status</p>
          <ul className="space-y-2">{byStatus.map(({ k, n }) => <li key={k} className="flex items-center justify-between"><span className={`badge ${STATUS[k].cls}`}>{STATUS[k].label}</span><b>{n}</b></li>)}</ul></section>
        <section className="card"><p className="mb-3 font-bold text-navy">Serviços que mais faturam (aprovados)</p>
          {top.length === 0 ? <p className="text-sm text-muted">Sem dados ainda.</p> : <ul className="space-y-2">{top.map((t) => <li key={t.description} className="flex justify-between gap-3 text-sm"><span className="truncate">{t.description} <span className="text-muted">({t._count}x)</span></span><b>{brl(t._sum.total)}</b></li>)}</ul>}</section>
      </div>
    </div>
  );
}
function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="card border-l-4 border-l-brand"><p className="text-xs font-bold uppercase text-muted">{label}</p><p className="mt-1 text-2xl font-bold text-navy">{value}</p>{sub && <p className="text-xs text-muted">{sub}</p>}</div>;
}
