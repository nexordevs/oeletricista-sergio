import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/money";

export default async function Usuarios({ searchParams: sp }: { searchParams: { q?: string; f?: string } }) {
  await requireAdmin();
  const now = new Date();
  const where: Prisma.UserWhereInput = { role: "ELECTRICIAN" };
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }];
  if (sp.f === "ativos") where.OR = [{ subscriptions: { some: { status: "ACTIVE", currentPeriodEnd: { gt: now } } } }, { manualAccessUntil: { gt: now } }];
  if (sp.f === "inadimplentes") where.subscriptions = { some: { status: "PAST_DUE" } };
  if (sp.f === "vencidos") where.AND = [{ subscriptions: { some: {} } }, { subscriptions: { none: { currentPeriodEnd: { gt: now } } } }, { OR: [{ manualAccessUntil: null }, { manualAccessUntil: { lt: now } }] }];
  if (sp.f === "bloqueados") where.blocked = true;
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 300, include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: true } }, _count: { select: { quotes: true } } } });
  const tabs = [["", "Todos"], ["ativos", "Ativos"], ["inadimplentes", "Inadimplentes"], ["vencidos", "Vencidos"], ["bloqueados", "Bloqueados"]];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{tabs.map(([k, l]) => <Link key={k} href={`/admin/usuarios${k ? `?f=${k}` : ""}`} className={`badge px-3 py-1.5 text-sm ${(sp.f || "") === k ? "bg-navy text-white" : "bg-white text-navy"}`}>{l}</Link>)}</div>
      <form className="flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Buscar nome ou e-mail" className="input" /><button className="btn-navy">Buscar</button></form>
      <div className="card overflow-x-auto p-3">
        <table className="table-x min-w-[720px]"><thead><tr><th>Nome</th><th>E-mail</th><th>Plano</th><th>Status</th><th>Orçamentos</th><th>Cadastro</th></tr></thead>
          <tbody>{users.map((u) => { const s = u.subscriptions[0]; const manual = u.manualAccessUntil && u.manualAccessUntil > now; return (
            <tr key={u.id}><td><Link href={`/admin/usuarios/${u.id}`} className="font-bold text-navy hover:underline">{u.name}</Link>{u.blocked && <span className="badge ml-1 bg-red-100 text-red-700">Bloqueado</span>}</td><td className="text-muted">{u.email}</td>
              <td>{manual ? "Manual" : s?.plan.name ?? "—"}</td><td>{manual ? <span className="badge bg-green-100 text-green-800">Liberado</span> : s ? <span className="badge bg-light text-navy">{s.status}</span> : <span className="text-muted">Sem assinatura</span>}</td>
              <td>{u._count.quotes}</td><td>{fmtDate(u.createdAt)}</td></tr>); })}</tbody></table>
        {users.length === 0 && <p className="p-4 text-center text-muted">Nenhum usuário encontrado.</p>}
      </div>
    </div>
  );
}
