import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { planFeatures } from "@/components/site/PlanCards";
import { brl, fmtDate } from "@/lib/money";
import { SubscribeForm } from "./SubscribeForm";
import { CancelButton } from "./CancelButton";
import { PaymentChecker } from "./PaymentChecker";

const ST: Record<string, [string, string]> = { PENDING: ["Aguardando pagamento", "bg-amber-100 text-amber-800"], ACTIVE: ["Ativa", "bg-green-100 text-green-800"], PAST_DUE: ["Pagamento pendente", "bg-red-100 text-red-700"], CANCELLED: ["Cancelada", "bg-gray-100 text-gray-700"], EXPIRED: ["Expirada", "bg-gray-100 text-gray-700"] };

export default async function Assinatura(props: { searchParams: Promise<{ plano?: string; limite?: string }> }) {
  const searchParams = await props.searchParams;
  const { user, access } = await panelContext();
  const [plans, subs, payments] = await Promise.all([
    prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subscription.findMany({ where: { userId: user.id, mpPreapprovalId: { not: null } }, include: { plan: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 24 }),
  ]);
  const current = subs.find((s) => ["ACTIVE", "PAST_DUE"].includes(s.status) || (s.status === "CANCELLED" && s.currentPeriodEnd && s.currentPeriodEnd > new Date()));
  const pending = subs.find((s) => s.status === "PENDING");
  return (
    <div className="space-y-6">
      {searchParams.limite && <p className="rounded-xl border-2 border-brand bg-white p-4 font-bold text-navy">Você atingiu o limite de orçamentos do seu plano este mês. Faça upgrade para orçamentos ilimitados.</p>}
      <section className="card">
        <p className="text-xs font-bold uppercase text-muted">Situação atual</p>
        {access.active ? (
          <p className="mt-1 text-lg"><b className="text-navy">Plano {access.plan?.name}</b> {access.until && <span className="text-muted">· acesso até {fmtDate(access.until)}</span>} {access.source === "manual" && <span className="badge ml-1 bg-light text-navy">Liberado pela administração</span>}</p>
        ) : <p className="mt-1 text-lg font-bold text-red-700">Sem assinatura ativa</p>}
        {current && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <span className={`badge ${ST[current.status][1]}`}>{ST[current.status][0]}</span>
            <span className="text-sm text-muted">{current.plan.name} · {current.cycle === "YEARLY" ? "anual" : "mensal"} · {brl(current.amount)}</span>
            {current.status === "CANCELLED" ? <span className="text-sm text-muted">Sem novas cobranças. Acesso até {fmtDate(current.currentPeriodEnd)}.</span> : (
              <div className="ml-auto"><CancelButton id={current.id} until={fmtDate(current.currentPeriodEnd)} /></div>
            )}
          </div>
        )}
        {pending && <div className="mt-4 space-y-2"><PaymentChecker subId={pending.id} planName={pending.plan.name} /><div className="flex items-center gap-2 text-sm text-muted">Desistiu desse plano? <CancelButton id={pending.id} pending /></div></div>}
      </section>

      <section>
        <p className="mb-3 text-lg font-bold text-navy">{access.active ? "Trocar de plano" : "Escolha seu plano"}</p>
        <SubscribeForm email={user.email} preselect={searchParams.plano} plans={plans.map((p) => ({ id: p.id, slug: p.slug, name: p.name, description: p.description, monthly: Number(p.priceMonthly), yearly: Number(p.priceYearly), features: planFeatures(p), highlight: p.highlight, current: access.plan?.id === p.id && access.source === "subscription" }))} />
      </section>

      <p className="text-sm text-muted">Você pode cancelar quando quiser, aqui mesmo. Ao cancelar, o Mercado Pago não faz novas cobranças e o acesso continua até o fim do período já pago.</p>

      <section className="card p-0">
        <p className="px-5 py-4 text-lg font-bold text-navy">Histórico de pagamentos</p>
        {payments.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">Nenhum pagamento registrado ainda.</p> : (
          <div className="overflow-x-auto px-3 pb-3"><table className="table-x min-w-[480px]"><thead><tr><th>Data</th><th>Descrição</th><th>Status</th><th className="text-right">Valor</th></tr></thead>
            <tbody>{payments.map((p) => <tr key={p.id}><td>{fmtDate(p.paidAt || p.createdAt)}</td><td>{p.description}</td><td><span className={`badge ${p.status === "approved" || p.status === "manual" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{p.status === "approved" ? "Aprovado" : p.status === "manual" ? "Manual" : p.status === "rejected" ? "Recusado" : p.status}</span></td><td className="text-right font-bold">{brl(p.amount)}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </div>
  );
}
