import Link from "next/link";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { expireQuotes } from "@/lib/quotes";
import { monthStart, hasFeature } from "@/lib/access";
import { brl, fmtDate } from "@/lib/money";
import { StatusBadge } from "@/lib/quote-status";
import { IconPlus, IconCheck } from "@/components/icons";
import { dismissOnboarding } from "./actions";

export default async function Dashboard() {
  const { user, access } = await panelContext();
  await expireQuotes(user.id);
  const since = monthStart();
  const [byStatus, monthAgg, monthApproved, recent, brand, clients, customPrices] = await Promise.all([
    prisma.quote.groupBy({ by: ["status"], where: { userId: user.id }, _count: true, _sum: { total: true } }),
    prisma.quote.aggregate({ where: { userId: user.id, createdAt: { gte: since }, status: { not: "DRAFT" } }, _count: true, _sum: { total: true } }),
    prisma.quote.aggregate({ where: { userId: user.id, decidedAt: { gte: since }, status: "APPROVED" }, _count: true, _sum: { total: true, helperAmount: true, materialCost: true } }),
    prisma.quote.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.brand.findUnique({ where: { userId: user.id }, select: { phone: true, whatsapp: true, logoMime: true } }),
    prisma.client.count({ where: { userId: user.id } }),
    prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM "UserService" WHERE "userId" = ${user.id} AND ("updatedAt" > "createdAt" + interval '1 second' OR "templateId" IS NULL)`.then((r) => Number(r[0]?.n ?? 0)),
  ]);
  const c = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const total = byStatus.reduce((a, b) => a + b._count, 0);
  const totalValue = byStatus.filter((b) => b.status !== "DRAFT").reduce((a, b) => a + Number(b._sum.total ?? 0), 0);
  const pending = c("SENT") + c("VIEWED");
  // Divisão do valor: o que foi para ajudante e material sai do aprovado → "ficou pra você"
  const apMes = Number(monthApproved._sum.total ?? 0), ajMes = Number(monthApproved._sum.helperAmount ?? 0), matMes = Number(monthApproved._sum.materialCost ?? 0);
  const showNet = hasFeature(access, "finance");

  const steps = [
    { done: Boolean(brand?.whatsapp || brand?.phone), label: "Preencha sua marca (nome, WhatsApp, logomarca)", href: "/painel/marca" },
    { done: customPrices > 0, label: "Confira os preços da sua tabela de serviços", href: "/painel/servicos" },
    { done: access.active, label: "Ative sua assinatura", href: "/painel/assinatura" },
    { done: clients > 0, label: "Cadastre seu primeiro cliente", href: "/painel/clientes" },
    { done: total > 0, label: "Crie seu primeiro orçamento", href: "/painel/orcamentos/novo" },
  ];
  const showOnboarding = !user.onboardedAt && steps.some((s) => !s.done);

  return (
    <div className="space-y-6">
      {showOnboarding && (
        <section className="rounded-2xl bg-navy p-5 text-white sm:p-6">
          <p className="text-xl font-bold">Bem-vindo, {user.name.split(" ")[0]}! 👋</p>
          <p className="mt-1 text-navy-soft">Siga estes passos para enviar seu primeiro orçamento profissional:</p>
          <ol className="mt-4 space-y-2">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${s.done ? "text-navy-soft line-through" : "bg-white/5 font-bold hover:bg-white/10"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.done ? "bg-green-500 text-white" : "bg-brand text-navy"}`}>{s.done ? <IconCheck className="h-4 w-4" /> : i + 1}</span>{s.label}
                </Link>
              </li>
            ))}
          </ol>
          <form action={dismissOnboarding}><button className="mt-4 text-sm font-bold text-navy-soft underline hover:text-white">Já sei usar, esconder este guia</button></form>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">Resumo dos seus orçamentos</p>
        <Link href="/painel/orcamentos/novo" className="btn-primary"><IconPlus /> Novo orçamento</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orçamentos criados" value={String(total)} />
        <Stat label="Aprovados" value={String(c("APPROVED"))} tone="green" />
        <Stat label="Pendentes" value={String(pending)} tone="blue" />
        <Stat label="Recusados" value={String(c("REJECTED"))} tone="red" />
      </div>
      <div className={`grid gap-3 md:grid-cols-2 ${showNet ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <Stat big label="Valor total orçado" value={brl(totalValue)} />
        <Stat big label="Orçado este mês" value={brl(monthAgg._sum.total)} sub={`${monthAgg._count} orçamento(s) enviados`} />
        <Stat big label="Aprovado este mês" value={brl(apMes)} sub={`${monthApproved._count} aprovado(s)`} tone="green" />
        {showNet && (
          <Link href="/painel/financeiro?aba=divisao" className="card border-l-4 border-l-brand bg-navy text-white transition hover:opacity-95">
            <p className="text-xs font-bold uppercase tracking-wide text-navy-soft">Ficou pra você este mês</p>
            <p className="mt-1 text-2xl font-bold text-brand">{brl(apMes - ajMes - matMes)}</p>
            <p className="text-xs text-navy-soft">{ajMes || matMes ? `− ajudante ${brl(ajMes)} · − material ${brl(matMes)}` : "Informe o ajudante e o material em cada orçamento aprovado →"}</p>
          </Link>
        )}
      </div>
      {access.active && access.quoteLimit != null && (
        <p className="text-sm text-muted">Uso do plano: <b>{access.quotesThisMonth} de {access.quoteLimit}</b> orçamentos este mês.</p>
      )}

      <section className="card p-0">
        <div className="flex items-center justify-between px-5 py-4"><p className="font-bold text-navy">Últimos orçamentos</p><Link href="/painel/orcamentos" className="text-sm font-bold text-navy hover:underline">Ver todos</Link></div>
        {recent.length === 0 ? (
          <div className="px-5 pb-6 text-muted">Você ainda não criou nenhum orçamento. <Link href="/painel/orcamentos/novo" className="font-bold text-navy underline">Criar o primeiro</Link></div>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((q) => (
              <li key={q.id}><Link href={`/painel/orcamentos/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-light">
                <span className="min-w-0"><span className="block truncate font-bold text-navy">#{String(q.number).padStart(3, "0")} · {q.clientName}</span><span className="text-xs text-muted">{fmtDate(q.updatedAt)}</span></span>
                <span className="flex shrink-0 flex-col items-end gap-1"><b>{brl(q.total)}</b><StatusBadge s={q.status} /></span>
              </Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, tone, big }: { label: string; value: string; sub?: string; tone?: "green" | "blue" | "red"; big?: boolean }) {
  const color = tone === "green" ? "text-green-700" : tone === "blue" ? "text-blue-700" : tone === "red" ? "text-red-700" : "text-navy";
  return (
    <div className={`card ${big ? "border-l-4 border-l-brand" : ""}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-bold ${big ? "text-2xl" : "text-3xl"} ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
