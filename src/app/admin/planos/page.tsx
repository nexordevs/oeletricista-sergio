import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { savePlan } from "../actions";
import type { Plan } from "@prisma/client";

const feats: [keyof Plan, string][] = [["featBrandFull", "Cores e assinatura no PDF"], ["featClientHistory", "Histórico por cliente"], ["featStatus", "Controle de status"], ["featWhatsapp", "Envio por WhatsApp"], ["featFinance", "Financeiro"], ["featReports", "Relatórios"], ["featCourses", "Videoaulas"], ["highlight", "Destacar como mais escolhido"], ["active", "Plano ativo (visível para contratar)"]];
const n = (v: unknown) => Number(v).toFixed(2).replace(".", ",");

function PlanForm({ p }: { p?: Plan }) {
  return (
    <ActionForm action={savePlan} className="card space-y-3" reset={!p}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <p className="text-lg font-bold text-navy">{p ? p.name : "Novo plano"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Nome</label><input name="name" defaultValue={p?.name} className="input" /></div>
        <div><label className="label">Identificador (URL)</label><input name="slug" defaultValue={p?.slug} className="input" /></div>
        <div className="sm:col-span-2"><label className="label">Descrição curta</label><input name="description" defaultValue={p?.description ?? ""} className="input" /></div>
        <div><label className="label">Preço mensal (R$)</label><input name="priceMonthly" defaultValue={p ? n(p.priceMonthly) : ""} inputMode="decimal" className="input" /></div>
        <div><label className="label">Preço anual (R$)</label><input name="priceYearly" defaultValue={p ? n(p.priceYearly) : ""} inputMode="decimal" className="input" /></div>
        <div><label className="label">Limite de orçamentos/mês</label><input name="quoteLimit" defaultValue={p?.quoteLimit ?? ""} placeholder="Vazio = ilimitado" inputMode="numeric" className="input" /></div>
        <div><label className="label">Ordem</label><input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className="input" /></div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{feats.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name={k} defaultChecked={p ? Boolean(p[k]) : k === "active"} className="h-4 w-4 accent-navy" />{l}</label>)}</div>
      <Submit className="btn-primary">Salvar plano</Submit>
    </ActionForm>
  );
}

export default async function Planos() {
  await requireAdmin();
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } } });
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-white p-4 text-sm text-muted">Alterar o preço vale para <b>novas assinaturas</b>. Assinaturas já ativas no Mercado Pago continuam com o valor contratado. Os limites e recursos valem imediatamente para todos do plano.</p>
      <div className="grid gap-5 xl:grid-cols-2">{plans.map((p) => <div key={p.id}><p className="mb-1 text-sm text-muted">{p._count.subscriptions} assinatura(s) ativa(s)</p><PlanForm p={p} /></div>)}<PlanForm /></div>
    </div>
  );
}
