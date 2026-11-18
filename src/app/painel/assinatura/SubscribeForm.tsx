"use client";
import { useState, useActionState } from "react";
import { subscribe } from "./actions";
import { Submit, FormMessage } from "@/components/ui";
import { IconCheck } from "@/components/icons";

type P = { id: string; slug: string; name: string; description: string | null; monthly: number; yearly: number; features: string[]; highlight: boolean; current: boolean };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SubscribeForm({ plans, preselect }: { plans: P[]; preselect?: string }) {
  const [s, a] = useActionState(subscribe, undefined);
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [plan, setPlan] = useState(plans.find((p) => p.slug === preselect)?.id || plans.find((p) => p.highlight)?.id || plans[0]?.id);
  return (
    <form action={a} className="space-y-5">
      <FormMessage state={s} />
      <div className="inline-flex rounded-xl bg-white p-1 shadow-sm" role="radiogroup" aria-label="Período">
        {(["MONTHLY", "YEARLY"] as const).map((c) => (
          <button type="button" key={c} onClick={() => setCycle(c)} className={`rounded-lg px-4 py-2 text-sm font-bold ${cycle === c ? "bg-navy text-white" : "text-navy"}`}>{c === "MONTHLY" ? "Mensal" : "Anual (economize)"}</button>
        ))}
      </div>
      <input type="hidden" name="cycle" value={cycle} /><input type="hidden" name="planId" value={plan} />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <button type="button" key={p.id} onClick={() => setPlan(p.id)} className={`relative flex flex-col rounded-2xl border-2 bg-white p-5 text-left transition ${plan === p.id ? "border-brand shadow-lg" : "border-line"}`}>
            {p.current && <span className="badge absolute -top-3 left-5 bg-green-600 text-white">Seu plano</span>}
            <span className="flex items-center justify-between"><span className="text-lg font-bold text-navy">{p.name}</span><span className={`h-5 w-5 rounded-full border-2 ${plan === p.id ? "border-[6px] border-brand" : "border-line"}`} /></span>
            <span className="mt-2 text-3xl font-bold text-navy">{brl(cycle === "MONTHLY" ? p.monthly : p.yearly)}<span className="text-sm font-normal text-muted">/{cycle === "MONTHLY" ? "mês" : "ano"}</span></span>
            {cycle === "YEARLY" && <span className="text-xs font-bold text-green-700">Equivale a {brl(p.yearly / 12)}/mês</span>}
            <ul className="mt-4 space-y-1.5 text-sm">{p.features.map((f) => <li key={f} className="flex gap-1.5"><IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />{f}</li>)}</ul>
          </button>
        ))}
      </div>
      <Submit className="btn-primary w-full sm:w-auto" pending="Abrindo Mercado Pago...">Continuar para pagamento</Submit>
      <p className="text-xs text-muted">Pagamento recorrente processado pelo Mercado Pago. O acesso é liberado automaticamente quando o pagamento for aprovado. Cancele quando quiser.</p>
    </form>
  );
}
