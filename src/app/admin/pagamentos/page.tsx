import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { brl, fmtDate } from "@/lib/money";
export default async function Pagamentos() {
  await requireAdmin();
  const [payments, months, events] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { id: true, name: true } } } }),
    prisma.$queryRaw<{ m: string; total: number }[]>`SELECT to_char(date_trunc('month', "paidAt" AT TIME ZONE 'America/Fortaleza'), 'MM/YYYY') AS m, SUM(amount)::float AS total FROM "Payment" WHERE status IN ('approved','manual') AND "paidAt" IS NOT NULL GROUP BY 1, date_trunc('month', "paidAt" AT TIME ZONE 'America/Fortaleza') ORDER BY date_trunc('month', "paidAt" AT TIME ZONE 'America/Fortaleza') DESC LIMIT 12`,
    prisma.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <div className="space-y-6">
      <section className="card"><p className="mb-3 font-bold text-navy">Faturamento mensal</p>
        {months.length === 0 ? <p className="text-sm text-muted">Nenhum pagamento confirmado ainda.</p> : <div className="flex flex-wrap gap-3">{months.map((m) => <div key={m.m} className="rounded-xl bg-light px-4 py-3"><p className="text-xs font-bold text-muted">{m.m}</p><p className="text-lg font-bold text-navy">{brl(m.total)}</p></div>)}</div>}
      </section>
      <section className="card overflow-x-auto p-3"><table className="table-x min-w-[640px]"><thead><tr><th>Data</th><th>Usuário</th><th>Descrição</th><th>Status</th><th className="text-right">Valor</th></tr></thead>
        <tbody>{payments.map((p) => <tr key={p.id}><td>{fmtDate(p.paidAt || p.createdAt)}</td><td><Link href={`/admin/usuarios/${p.user.id}`} className="font-bold text-navy hover:underline">{p.user.name}</Link></td><td>{p.description}</td><td>{p.status}</td><td className="text-right font-bold">{brl(p.amount)}</td></tr>)}</tbody></table>
        {payments.length === 0 && <p className="p-4 text-center text-muted">Nenhum pagamento.</p>}</section>
      <section className="card"><p className="mb-2 font-bold text-navy">Últimos webhooks do Mercado Pago</p>
        {events.length === 0 ? <p className="text-sm text-muted">Nenhum evento recebido ainda.</p> : <ul className="space-y-1 text-sm">{events.map((e) => <li key={e.id} className="flex justify-between gap-3"><span>{fmtDate(e.createdAt)} · {e.topic} · {e.resourceId}</span><span className={e.error ? "text-red-700" : e.processed ? "text-green-700" : "text-muted"}>{e.error ? "erro" : e.processed ? "ok" : "pendente"}</span></li>)}</ul>}</section>
    </div>
  );
}
