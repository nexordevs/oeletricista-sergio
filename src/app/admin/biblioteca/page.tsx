import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { saveTemplate } from "../actions";
const n = (v: unknown) => Number(v).toFixed(2).replace(".", ",");
export default async function Biblioteca() {
  await requireAdmin();
  const list = await prisma.serviceTemplate.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }], include: { _count: { select: { userServices: true } } } });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <p className="rounded-xl bg-white p-4 text-sm text-muted">Estes são os <b>preços sugeridos</b> copiados para a tabela de cada novo assinante. Alterar aqui <b>não muda</b> os preços que os assinantes já personalizaram; eles veem o novo valor como “preço sugerido”.</p>
        {list.map((t) => (
          <ActionForm key={t.id} action={saveTemplate} className="card grid gap-2 sm:grid-cols-[1fr_1fr_80px_110px_auto] sm:items-end">
            <input type="hidden" name="id" value={t.id} />
            <div><label className="label">Serviço</label><input name="name" defaultValue={t.name} className="input py-2.5" /></div>
            <div><label className="label">Categoria</label><input name="category" defaultValue={t.category} className="input py-2.5" /></div>
            <div><label className="label">Unid.</label><input name="unit" defaultValue={t.unit} className="input py-2.5" /></div>
            <div><label className="label">Sugerido</label><input name="suggestedPrice" defaultValue={n(t.suggestedPrice)} inputMode="decimal" className="input py-2.5 text-right" /></div>
            <div className="flex items-center gap-3 pb-1"><label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={t.active} className="accent-navy" />Ativo</label><Submit className="btn-navy btn-sm" pending="...">Salvar</Submit></div>
            <input type="hidden" name="description" value={t.description ?? ""} />
            <p className="text-xs text-muted sm:col-span-5">Na tabela de {t._count.userServices} profissional(is)</p>
          </ActionForm>
        ))}
      </div>
      <aside className="card h-fit"><p className="mb-3 font-bold text-navy">Novo serviço na biblioteca</p>
        <ActionForm action={saveTemplate} reset>
          <div><label className="label">Serviço</label><input name="name" className="input" /></div>
          <div><label className="label">Descrição</label><input name="description" className="input" /></div>
          <div><label className="label">Categoria</label><input name="category" defaultValue="Geral" className="input" /></div>
          <div className="grid grid-cols-2 gap-2"><div><label className="label">Unidade</label><input name="unit" defaultValue="un" className="input" /></div><div><label className="label">Preço sugerido</label><input name="suggestedPrice" inputMode="decimal" className="input" /></div></div>
          <Submit className="btn-primary w-full">Adicionar</Submit>
          <p className="text-xs text-muted">Assinantes existentes recebem um aviso para adicionar os serviços novos à tabela deles.</p>
        </ActionForm>
      </aside>
    </div>
  );
}
