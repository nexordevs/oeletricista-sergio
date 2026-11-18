import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { ServiceRow } from "./ServiceRow";
import { NewService } from "./NewService";
import { importLibrary } from "./actions";
import { CATEGORY_ORDER } from "../../../../prisma/price-table";

export default async function Servicos() {
  const { user } = await panelContext();
  const [list, missing] = await Promise.all([
    prisma.userService.findMany({ where: { userId: user.id }, orderBy: [{ category: "asc" }, { name: "asc" }], include: { template: { select: { suggestedPrice: true, minPrice: true, maxPrice: true } } } }),
    prisma.serviceTemplate.count({ where: { active: true, userServices: { none: { userId: user.id } } } }),
  ]);
  const groups = new Map<string, typeof list>();
  const rank = (c: string) => { const i = CATEGORY_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  for (const s of [...list].sort((a, b) => rank(a.category) - rank(b.category))) groups.set(s.category, [...(groups.get(s.category) || []), s]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-muted">Esta é a <b>sua</b> tabela de preços. Os valores iniciais são o <b>preço médio de mercado 2026</b> (só mão de obra, sem material) — use como estão ou ajuste para a sua realidade. Suas alterações não afetam outros profissionais.</p>
        {missing > 0 && (
          <form action={importLibrary} className="flex flex-col gap-2 rounded-xl border-2 border-brand bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-bold text-navy">{missing} serviço(s) da biblioteca ainda não estão na sua tabela.</span>
            <button className="btn-primary btn-sm">Adicionar à minha tabela</button>
          </form>
        )}
        {list.length === 0 && <div className="card text-center text-muted">Sua tabela está vazia. Adicione serviços ao lado.</div>}
        {[...groups.entries()].map(([cat, items]) => (
          <section key={cat} className="card p-0">
            <p className="rounded-t-2xl bg-navy px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white">{cat}</p>
            {items.map((s) => <ServiceRow key={s.id} s={{ id: s.id, name: s.name, unit: s.unit, price: s.price.toString(), category: s.category, suggested: s.template?.suggestedPrice.toString() ?? null, min: s.template?.minPrice?.toString() ?? null, max: s.template?.maxPrice?.toString() ?? null }} />)}
          </section>
        ))}
      </div>
      <aside className="card h-fit lg:sticky lg:top-6"><p className="mb-3 text-lg font-bold text-navy">Novo serviço</p><NewService categories={[...groups.keys()]} /></aside>
    </div>
  );
}
