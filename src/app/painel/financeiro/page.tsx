import Link from "next/link";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { hasFeature } from "@/lib/access";
import { brl, fmtDate } from "@/lib/money";
import { Locked } from "@/components/panel/Locked";
import { EntryForm } from "./EntryForm";
import { deleteEntry } from "./actions";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function Financeiro({ searchParams }: { searchParams: { m?: string } }) {
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
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-white p-2"><Link href={`?m=${prev}`} className="btn-ghost btn-sm">← Anterior</Link><b className="capitalize text-navy">{label}</b><Link href={`?m=${next}`} className="btn-ghost btn-sm">Próximo →</Link></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="card"><p className="text-xs font-bold uppercase text-muted">Entradas</p><p className="text-xl font-bold text-green-700">{brl(inc)}</p></div>
          <div className="card"><p className="text-xs font-bold uppercase text-muted">Saídas</p><p className="text-xl font-bold text-red-700">{brl(exp)}</p></div>
          <div className="card border-l-4 border-l-brand"><p className="text-xs font-bold uppercase text-muted">Saldo</p><p className="text-xl font-bold text-navy">{brl(inc - exp)}</p></div>
        </div>
        {entries.length === 0 ? <div className="card text-center text-muted">Nenhum lançamento neste mês.</div> : (
          <ul className="card divide-y divide-line p-0">{entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <span><b className="block text-navy">{e.description}</b><span className="text-xs text-muted">{fmtDate(e.date)}</span></span>
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
  );
}
