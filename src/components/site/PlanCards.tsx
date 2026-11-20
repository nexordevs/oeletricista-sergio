import Link from "next/link";
import type { Plan } from "@prisma/client";
import { brl } from "@/lib/money";
import { IconCheck } from "@/components/icons";

export function planFeatures(p: Plan) {
  const f = [p.quoteLimit == null ? "Orçamentos ilimitados" : `Até ${p.quoteLimit} orçamentos por mês`, "Cadastro de clientes", "Catálogo de serviços e tabela de preços", "PDF com sua logomarca", "Calculadora de circuitos (NBR 5410)", "Guia de solução de problemas"];
  if (p.featBrandFull) f.push("Personalização completa (cores e assinatura)");
  if (p.featClientHistory) f.push("Histórico por cliente");
  if (p.featStatus) f.push("Controle de status (aprovado, recusado…)");
  if (p.featWhatsapp) f.push("Envio por WhatsApp com link");
  if (p.featFinance) f.push("Controle financeiro");
  if (p.featReports) f.push("Relatórios e indicadores");
  if (p.featCourses) f.push("Videoaulas para eletricistas (em andamento)");
  return f;
}

export function PlanCards({ plans, cta = "/cadastro" }: { plans: Plan[]; cta?: string }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {plans.map((p) => (
        <div key={p.id} className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 ${p.highlight ? "border-brand shadow-xl" : "border-line"}`}>
          {p.highlight && <span className="badge absolute -top-3 left-6 bg-brand text-navy">Mais escolhido</span>}
          <p className="text-xl font-bold text-navy">{p.name}</p>
          {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
          <p className="mt-5"><span className="text-4xl font-bold text-navy">{brl(p.priceMonthly)}</span><span className="text-muted">/mês</span></p>
          <p className="text-sm text-muted">ou {brl(p.priceYearly)} por ano</p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {planFeatures(p).map((f) => <li key={f} className="flex gap-2 text-[15px]"><IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-dark" />{f}</li>)}
          </ul>
          <Link href={`${cta}?plano=${p.slug}`} className={`${p.highlight ? "btn-primary" : "btn-navy"} mt-6 w-full`}>Assinar {p.name}</Link>
        </div>
      ))}
    </div>
  );
}
