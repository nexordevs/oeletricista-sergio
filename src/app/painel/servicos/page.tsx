import Link from "next/link";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { ServiceRow } from "./ServiceRow";
import { NewService } from "./NewService";
import { importLibrary } from "./actions";
import { CATEGORY_ORDER } from "../../../../prisma/price-table";
import { MATERIAL_CATEGORY_ORDER } from "../../../../prisma/material-table";

export default async function Servicos(props: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await props.searchParams;
  const kind = tipo === "material" ? "MATERIAL" : "SERVICE";
  const mat = kind === "MATERIAL";
  const { user } = await panelContext();
  const [list, missing, counts] = await Promise.all([
    prisma.userService.findMany({ where: { userId: user.id, kind }, orderBy: [{ category: "asc" }, { name: "asc" }], include: { template: { select: { suggestedPrice: true, minPrice: true, maxPrice: true } } } }),
    prisma.serviceTemplate.count({ where: { active: true, kind, userServices: { none: { userId: user.id } } } }),
    prisma.userService.groupBy({ by: ["kind"], where: { userId: user.id }, _count: true }),
  ]);
  const count = (k: string) => counts.find((c) => c.kind === k)?._count ?? 0;
  const order = mat ? MATERIAL_CATEGORY_ORDER : CATEGORY_ORDER;
  const groups = new Map<string, typeof list>();
  const rank = (c: string) => { const i = order.indexOf(c); return i < 0 ? 99 : i; };
  for (const s of [...list].sort((a, b) => rank(a.category) - rank(b.category))) groups.set(s.category, [...(groups.get(s.category) || []), s]);
  const tab = (on: boolean) => `flex-1 rounded-xl px-4 py-3 text-center font-bold transition ${on ? "bg-navy text-white" : "bg-white text-navy hover:bg-light"}`;
  return (
    <div className="space-y-5">
      <nav className="flex gap-2" aria-label="Tipo de item">
        <Link href="/painel/servicos" className={tab(!mat)} aria-current={!mat ? "page" : undefined}>Serviços <span className="opacity-70">({count("SERVICE")})</span></Link>
        <Link href="/painel/servicos?tipo=material" className={tab(mat)} aria-current={mat ? "page" : undefined}>Materiais <span className="opacity-70">({count("MATERIAL")})</span></Link>
      </nav>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <p className="rounded-xl bg-white px-4 py-3 text-sm text-muted">
            {mat
              ? <>Esta é a <b>sua</b> tabela de materiais. Os valores iniciais são <b>preço de referência de loja (nov/2026)</b> — ajuste para o preço que você paga na sua loja, já com o seu ganho se quiser. Suas alterações não afetam outros profissionais.</>
              : <>Esta é a <b>sua</b> tabela de preços. Os valores iniciais são o <b>preço médio de mercado 2026</b> (só mão de obra, sem material) — use como estão ou ajuste para a sua realidade. Suas alterações não afetam outros profissionais.</>}
          </p>
          {missing > 0 && (
            <form action={importLibrary} className="flex flex-col gap-2 rounded-xl border-2 border-brand bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <input type="hidden" name="kind" value={kind} />
              <span className="font-bold text-navy">{missing} {mat ? "material(is)" : "serviço(s)"} da biblioteca ainda não estão na sua tabela.</span>
              <button className="btn-primary btn-sm">Adicionar à minha tabela</button>
            </form>
          )}
          {list.length === 0 && <div className="card text-center text-muted">Sua tabela de {mat ? "materiais" : "serviços"} está vazia. Adicione ao lado.</div>}
          {[...groups.entries()].map(([cat, items]) => (
            <details key={cat} className="card p-0" open={!mat}>
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl bg-navy px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white">{cat}<span className="font-normal normal-case opacity-70">{items.length} itens</span></summary>
              {items.map((s) => <ServiceRow key={s.id} s={{ id: s.id, name: s.name, unit: s.unit, price: s.price.toString(), category: s.category, kind: s.kind, suggested: s.template?.suggestedPrice.toString() ?? null, min: s.template?.minPrice?.toString() ?? null, max: s.template?.maxPrice?.toString() ?? null }} />)}
            </details>
          ))}
        </div>
        <aside className="card h-fit lg:sticky lg:top-6"><p className="mb-3 text-lg font-bold text-navy">{mat ? "Novo material" : "Novo serviço"}</p><NewService key={kind} kind={kind} categories={[...groups.keys()]} /></aside>
      </div>
    </div>
  );
}
