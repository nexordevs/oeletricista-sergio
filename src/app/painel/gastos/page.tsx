import Link from "next/link";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { hasFeature } from "@/lib/access";
import { brl, fmtDate } from "@/lib/money";
import { Locked } from "@/components/panel/Locked";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteEntry } from "../financeiro/actions";
import { deleteCategory } from "./actions";
import { ExpenseForm, CategoryForm } from "./forms";
import { analyze, DEFAULT_CATEGORIES, GROUPS, type Group } from "@/lib/budget";

export const metadata = { title: "Controle de gastos" };

export default async function Gastos(props: { searchParams: Promise<{ m?: string }> }) {
  const sp = await props.searchParams;
  const { user, access } = await panelContext();
  if (!hasFeature(access, "finance")) return <Locked feature="O controle de gastos" />;

  // primeira vez: cria as categorias padrão (o eletricista edita depois)
  if ((await prisma.budgetCategory.count({ where: { userId: user.id } })) === 0)
    await prisma.budgetCategory.createMany({ data: DEFAULT_CATEGORIES.map(([name, group], i) => ({ userId: user.id, name, group, sortOrder: i })) });

  const now = new Date(Date.now() - 3 * 3600e3);
  const m = /^\d{4}-\d{2}$/.test(sp.m || "") ? sp.m! : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const [y, mo] = m.split("-").map(Number);
  const start = new Date(Date.UTC(y, mo - 1, 1, 3)), end = new Date(Date.UTC(y, mo, 1, 3));
  const prev = `${mo === 1 ? y - 1 : y}-${String(mo === 1 ? 12 : mo - 1).padStart(2, "0")}`, next = `${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, "0")}`;
  const label = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

  const where = { userId: user.id, date: { gte: start, lt: end } };
  const [cats, spentBy, inc, other, saved, recent] = await Promise.all([
    prisma.budgetCategory.findMany({ where: { userId: user.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.financeEntry.groupBy({ by: ["categoryId"], where: { ...where, type: "EXPENSE", categoryId: { not: null } }, _sum: { amount: true } }),
    prisma.financeEntry.aggregate({ where: { ...where, type: "INCOME" }, _sum: { amount: true } }),
    prisma.financeEntry.aggregate({ where: { ...where, type: "EXPENSE", categoryId: null }, _sum: { amount: true } }),
    prisma.financeEntry.aggregate({ where: { userId: user.id, type: "EXPENSE", category: { group: "RESERVA" }, date: { lt: end } }, _sum: { amount: true } }),
    prisma.financeEntry.findMany({ where: { ...where, type: "EXPENSE", categoryId: { not: null } }, orderBy: { date: "desc" }, take: 30, include: { category: { select: { name: true } } } }),
  ]);
  const spentOf = (id: string) => Number(spentBy.find((s) => s.categoryId === id)?._sum.amount ?? 0);
  const rows = cats.map((c) => ({ id: c.id, name: c.name, group: c.group as Group, planned: Number(c.planned), spent: spentOf(c.id) }));
  const otherSpent = Number(other._sum.amount ?? 0);
  const a = analyze(Number(inc._sum.amount ?? 0), rows, Number(saved._sum.amount ?? 0), otherSpent);
  const today = now.toISOString().slice(0, 10);
  const guardou = rows.filter((c) => c.group === "RESERVA").reduce((x, c) => x + c.spent, 0);
  const gastou = a.spent - guardou; // guardar dinheiro não é gasto

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl bg-white p-2"><Link href={`?m=${prev}`} className="btn-ghost btn-sm">← Anterior</Link><b className="capitalize text-navy">{label}</b><Link href={`?m=${next}`} className="btn-ghost btn-sm">Próximo →</Link></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card"><p className="text-xs font-bold uppercase text-muted">Entrou</p><p className="whitespace-nowrap text-lg font-bold text-green-700 sm:text-xl">{brl(a.income)}</p></div>
        <div className="card"><p className="text-xs font-bold uppercase text-muted">Gastou</p><p className="whitespace-nowrap text-lg font-bold text-red-700 sm:text-xl">{brl(gastou)}</p>{a.income > 0 && <p className="text-xs text-muted">{Math.round((gastou / a.income) * 100)}% do que entrou</p>}</div>
        <div className="card"><p className="text-xs font-bold uppercase text-muted">Guardou</p><p className="whitespace-nowrap text-lg font-bold text-navy sm:text-xl">{brl(guardou)}</p><p className="text-xs text-muted">reserva e investimentos</p></div>
        <div className="card border-l-4 border-l-brand bg-navy text-white"><p className="text-xs font-bold uppercase text-navy-soft">Sobrou no caixa</p><p className={`whitespace-nowrap text-lg font-bold sm:text-xl ${a.leftover < 0 ? "text-red-300" : "text-brand"}`}>{brl(a.leftover)}</p></div>
      </div>

      {a.alerts.length > 0 && <ul className="card space-y-1 border-amber-200 bg-amber-50 text-sm text-amber-900">{a.alerts.map((t) => <li key={t}>⚠ {t}</li>)}</ul>}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {/* CATEGORIAS */}
          <section className="card p-0">
            <div className="flex items-center justify-between px-5 py-4"><p className="text-lg font-bold text-navy">Para onde vai o dinheiro</p><span className="text-xs text-muted">toque para editar</span></div>
            <ul className="divide-y divide-line">
              {rows.map((c) => {
                const pct = c.planned > 0 ? Math.round((c.spent / c.planned) * 100) : c.spent > 0 ? 100 : 0;
                const bar = c.planned <= 0 ? "bg-navy/40" : pct > 100 ? "bg-red-600" : pct >= 80 ? "bg-amber-500" : "bg-green-600";
                const rest = c.planned - c.spent;
                return (
                  <li key={c.id}>
                    <details className="group px-5 py-3">
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-baseline justify-between gap-2"><span className="font-bold text-navy">{c.name} <span className="ml-1 text-[11px] font-bold uppercase text-muted">{GROUPS[c.group].label}</span></span>
                          <span className="shrink-0 text-sm"><b>{brl(c.spent)}</b><span className="text-muted"> / {c.planned > 0 ? brl(c.planned) : "sem limite"}</span></span></div>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-light"><div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                        {c.planned > 0 && <p className={`mt-1 text-xs font-bold ${rest < 0 ? "text-red-700" : "text-muted"}`}>{rest < 0 ? `Estourou ${brl(-rest)}` : `Ainda pode gastar ${brl(rest)}`}</p>}
                      </summary>
                      <div className="mt-3 rounded-xl bg-light p-3">
                        <CategoryForm c={c} />
                        <form action={deleteCategory} className="mt-2 text-right"><input type="hidden" name="id" value={c.id} /><ConfirmButton message={`Remover a categoria "${c.name}"? Os gastos já lançados continuam no Financeiro.`} className="text-xs font-bold text-red-700 hover:underline">Remover categoria</ConfirmButton></form>
                      </div>
                    </details>
                  </li>
                );
              })}
              {otherSpent > 0 && <li className="flex items-baseline justify-between px-5 py-3 text-sm"><span className="text-muted">Outros gastos do mês (ajudante, material e lançamentos sem categoria)</span><b>{brl(otherSpent)}</b></li>}
            </ul>
            <div className="border-t border-line p-5"><p className="mb-2 font-bold text-navy">Nova categoria</p><CategoryForm /></div>
          </section>

          <section className="card p-0 lg:hidden">
            <p className="px-5 py-4 font-bold text-navy">Gastos do mês</p>
            {recent.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">Nenhum gasto lançado neste mês.</p> : (
              <ul className="divide-y divide-line">{recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span><b className="block text-navy">{e.description}</b><span className="text-xs text-muted">{fmtDate(e.date)} · {e.category?.name}</span></span>
                  <span className="flex items-center gap-2"><b className="text-red-700">{brl(e.amount)}</b><form action={deleteEntry}><input type="hidden" name="id" value={e.id} /><ConfirmButton message="Excluir este gasto?" className="text-xs font-bold text-muted hover:text-red-700">✕</ConfirmButton></form></span>
                </li>))}</ul>
            )}
          </section>
          {/* FÓRMULAS DE ECONOMIA */}
          <section className="card space-y-4">
            <p className="text-lg font-bold text-navy">Fórmulas de economia</p>
            <div>
              <p className="font-bold text-navy">Regra 50/30/20</p>
              <p className="text-sm text-muted">Do que entra no mês: 50% para o essencial, 30% para desejos e 20% para guardar.{a.income <= 0 && " Lance as entradas do mês (ou aprove orçamentos) para ver a divisão."}</p>
              <div className="mt-3 space-y-2">
                {a.groups.map((g) => (
                  <div key={g.group} className="rounded-xl border border-line p-3">
                    <div className="flex items-baseline justify-between gap-2"><b className="text-navy">{g.label} · {g.pct}%</b><span className="text-sm">ideal <b>{brl(g.suggested)}</b></span></div>
                    <p className="text-xs text-muted">{GROUPS[g.group].hint}</p>
                    <p className={`mt-1 text-sm font-bold ${g.status === "ok" ? "text-green-700" : "text-red-700"}`}>Planejado {brl(g.planned)} · gasto {brl(g.spent)} {g.status === "acima" ? "· acima do ideal" : g.status === "abaixo" ? "· abaixo do ideal" : a.income > 0 ? "· dentro do ideal ✓" : ""}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-navy p-4 text-white">
              <p className="font-bold">Reserva de emergência</p>
              <p className="text-sm text-navy-soft">Meta: 6 meses dos gastos essenciais. É o que segura as contas em mês fraco ou se você ficar sem trabalhar.</p>
              <div className="mt-3 flex items-baseline justify-between"><span className="text-sm text-navy-soft">Guardado</span><b className="text-brand">{brl(a.reserve.saved)} <span className="text-navy-soft">de {brl(a.reserve.goal)}</span></b></div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-brand" style={{ width: `${a.reserve.pct}%` }} /></div>
              <p className="mt-2 text-sm">{a.reserve.goal <= 0 ? "Coloque o valor planejado nas categorias essenciais para calcular a meta." : a.reserve.months === 0 ? "Meta atingida! 🎉 Continue guardando para investimentos." : a.reserve.months ? `Guardando ${brl(a.reserve.monthly)} por mês, você chega lá em ${a.reserve.months} ${a.reserve.months === 1 ? "mês" : "meses"}.` : "Defina quanto vai guardar por mês na categoria “Reserva de emergência” para ver em quanto tempo chega lá."}</p>
            </div>
            <ul className="space-y-1 text-sm text-muted">
              <li>💡 <b className="text-navy">Pague-se primeiro:</b> recebeu um serviço? Separe logo a parte da reserva, antes de gastar.</li>
              <li>💡 <b className="text-navy">Separe o dinheiro do trabalho:</b> ferramentas, combustível e MEI saem do essencial, não do bolso de casa.</li>
              <li>💡 <b className="text-navy">Mês bom, guarde mais:</b> autônomo tem mês fraco; o que sobra hoje paga as contas depois.</li>
            </ul>
          </section>
        </div>

        <aside className="order-first space-y-5 lg:order-none lg:sticky lg:top-6 lg:h-fit">
          <section className="card"><p className="mb-3 text-lg font-bold text-navy">Lançar gasto</p><ExpenseForm cats={rows.map((c) => ({ id: c.id, name: c.name }))} today={today} /></section>
          <section className="card hidden p-0 lg:block">
            <p className="px-5 py-4 font-bold text-navy">Gastos do mês</p>
            {recent.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">Nenhum gasto lançado neste mês.</p> : (
              <ul className="divide-y divide-line">{recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span><b className="block text-navy">{e.description}</b><span className="text-xs text-muted">{fmtDate(e.date)} · {e.category?.name}</span></span>
                  <span className="flex items-center gap-2"><b className="text-red-700">{brl(e.amount)}</b><form action={deleteEntry}><input type="hidden" name="id" value={e.id} /><ConfirmButton message="Excluir este gasto?" className="text-xs font-bold text-muted hover:text-red-700">✕</ConfirmButton></form></span>
                </li>))}</ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
