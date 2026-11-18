import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings, SETTING_DEFAULTS } from "@/lib/settings";
import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { saveSettings, addArea, deleteArea } from "../actions";
export default async function Site() {
  await requireAdmin();
  const [s, areas] = await Promise.all([getSettings(), prisma.serviceArea.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <ActionForm action={saveSettings} className="card space-y-4">
        {Object.entries(SETTING_DEFAULTS).map(([k, d]) => (
          <div key={k}><label className="label" htmlFor={k}>{d.label}</label>{d.long ? <textarea id={k} name={k} rows={4} defaultValue={s[k]} className="input" /> : <input id={k} name={k} defaultValue={s[k]} className="input" />}</div>
        ))}
        <Submit className="btn-primary">Salvar textos</Submit>
      </ActionForm>
      <aside className="card h-fit space-y-3">
        <p className="font-bold text-navy">Regiões atendidas</p>
        <ul className="space-y-1">{areas.map((a) => <li key={a.id} className="flex items-center justify-between rounded-lg bg-light px-3 py-2"><span className="font-bold">{a.name}</span><form action={deleteArea}><input type="hidden" name="id" value={a.id} /><button className="text-sm font-bold text-red-700">Remover</button></form></li>)}</ul>
        <ActionForm action={addArea} reset className="flex gap-2"><input name="name" placeholder="Bairro ou cidade" className="input" /><Submit className="btn-navy btn-sm" pending="...">Adicionar</Submit></ActionForm>
      </aside>
    </div>
  );
}
