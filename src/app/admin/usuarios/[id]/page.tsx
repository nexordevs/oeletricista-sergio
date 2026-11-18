import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { brl, fmtDate, fmtPhone } from "@/lib/money";
import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { toggleBlock, grantAccess, revokeAccess } from "../../actions";

export default async function Usuario(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await requireAdmin();
  const u = await prisma.user.findUnique({ where: { id: params.id }, include: { brand: { select: { professionalName: true, companyName: true, document: true, whatsapp: true, phone: true, address: true } }, subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } }, payments: { orderBy: { createdAt: "desc" }, take: 30 }, _count: { select: { quotes: true, clients: true } } } });
  if (!u) notFound();
  const [access, plans] = await Promise.all([getAccess(u), prisma.plan.findMany({ orderBy: { sortOrder: "asc" } })]);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xl font-bold text-navy">{u.name}</p><p className="text-muted">{u.email}</p><p className="text-sm text-muted">Cadastro em {fmtDate(u.createdAt)} · {u._count.quotes} orçamentos · {u._count.clients} clientes</p></div>
            {u.role !== "ADMIN" && <form action={toggleBlock}><input type="hidden" name="id" value={u.id} /><ConfirmButton message={u.blocked ? "Desbloquear este usuário?" : "Bloquear este usuário? Ele será desconectado imediatamente."} className={u.blocked ? "btn-navy btn-sm" : "btn-danger btn-sm"}>{u.blocked ? "Desbloquear" : "Bloquear"}</ConfirmButton></form>}
          </div>
          {u.brand && <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-muted">Nome profissional</dt><dd className="font-bold">{u.brand.professionalName}</dd></div><div><dt className="text-muted">Empresa</dt><dd className="font-bold">{u.brand.companyName || "—"}</dd></div><div><dt className="text-muted">CPF/CNPJ</dt><dd className="font-bold">{u.brand.document || "—"}</dd></div><div><dt className="text-muted">WhatsApp</dt><dd className="font-bold">{fmtPhone(u.brand.whatsapp) || "—"}</dd></div><div className="sm:col-span-2"><dt className="text-muted">Endereço</dt><dd className="font-bold">{u.brand.address || "—"}</dd></div></dl>}
        </section>
        <section className="card p-0"><p className="px-5 py-4 font-bold text-navy">Assinaturas</p>
          {u.subscriptions.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">Nenhuma.</p> : <div className="overflow-x-auto px-3 pb-3"><table className="table-x min-w-[520px]"><thead><tr><th>Plano</th><th>Ciclo</th><th>Status</th><th>Até</th><th>MP</th></tr></thead><tbody>{u.subscriptions.map((s) => <tr key={s.id}><td className="font-bold">{s.plan.name} · {brl(s.amount)}</td><td>{s.cycle === "YEARLY" ? "Anual" : "Mensal"}</td><td>{s.status}</td><td>{fmtDate(s.currentPeriodEnd)}</td><td className="text-xs text-muted">{s.mpPreapprovalId || "—"}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="card p-0"><p className="px-5 py-4 font-bold text-navy">Pagamentos</p>
          {u.payments.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">Nenhum.</p> : <div className="overflow-x-auto px-3 pb-3"><table className="table-x min-w-[480px]"><thead><tr><th>Data</th><th>Descrição</th><th>Status</th><th className="text-right">Valor</th></tr></thead><tbody>{u.payments.map((p) => <tr key={p.id}><td>{fmtDate(p.paidAt || p.createdAt)}</td><td>{p.description}</td><td>{p.status}</td><td className="text-right font-bold">{brl(p.amount)}</td></tr>)}</tbody></table></div>}
        </section>
      </div>
      <aside className="space-y-4">
        <section className="card"><p className="text-xs font-bold uppercase text-muted">Acesso atual</p><p className="mt-1 text-lg font-bold text-navy">{access.active ? `${access.plan?.name} (${access.source === "manual" ? "manual" : "assinatura"})` : "Sem acesso"}</p>{access.until && <p className="text-sm text-muted">até {fmtDate(access.until)}</p>}</section>
        <section className="card">
          <p className="mb-3 font-bold text-navy">Liberar acesso manualmente</p>
          <ActionForm action={grantAccess}>
            <input type="hidden" name="id" value={u.id} />
            <div><label className="label" htmlFor="planId">Plano</label><select id="planId" name="planId" className="input" defaultValue={u.manualPlanId ?? ""}><option value="" disabled>Escolha…</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="until">Liberado até</label><input id="until" name="until" type="date" defaultValue={u.manualAccessUntil?.toISOString().slice(0, 10) ?? in30} className="input" /></div>
            <div><label className="label" htmlFor="amount">Valor recebido por fora (opcional)</label><input id="amount" name="amount" inputMode="decimal" className="input" placeholder="0,00" /></div>
            <div><label className="label" htmlFor="note">Observação</label><input id="note" name="note" className="input" placeholder="Ex.: Pix recebido" /></div>
            <Submit className="btn-primary w-full">Liberar acesso</Submit>
          </ActionForm>
          {u.manualAccessUntil && <form action={revokeAccess} className="mt-3"><input type="hidden" name="id" value={u.id} /><ConfirmButton message="Remover a liberação manual?" className="btn-danger btn-sm w-full">Remover liberação manual</ConfirmButton></form>}
        </section>
      </aside>
    </div>
  );
}
