import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings, SETTING_DEFAULTS } from "@/lib/settings";
import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { saveSettings, addArea, deleteArea, saveProfilePhoto, removeProfilePhoto } from "../actions";
export default async function Site() {
  await requireAdmin();
  const [s, areas, photo] = await Promise.all([getSettings(), prisma.serviceArea.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }), prisma.siteImage.findUnique({ where: { key: "profile" }, select: { updatedAt: true } })]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <ActionForm action={saveSettings} className="card space-y-4">
        {Object.entries(SETTING_DEFAULTS).map(([k, d]) => (
          <div key={k}><label className="label" htmlFor={k}>{d.label}</label>{d.long ? <textarea id={k} name={k} rows={4} defaultValue={s[k]} className="input" /> : <input id={k} name={k} defaultValue={s[k]} className="input" />}</div>
        ))}
        <Submit className="btn-primary">Salvar textos</Submit>
      </ActionForm>
      <div className="space-y-6">
      <aside className="card h-fit space-y-3">
        <p className="font-bold text-navy">Sua foto (seção “Sobre mim”)</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo ? <img src={`/api/img/site/profile?v=${photo.updatedAt.getTime()}`} alt="Foto de perfil" className="aspect-[4/5] w-full rounded-xl object-cover" /> : <p className="text-sm text-muted">Nenhuma foto. A seção aparece sem foto até você enviar.</p>}
        <ActionForm action={saveProfilePhoto} className="space-y-2"><input type="file" name="photo" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:font-bold file:text-white" /><Submit className="btn-navy btn-sm w-full" pending="Enviando...">Enviar foto</Submit></ActionForm>
        {photo && <form action={removeProfilePhoto}><button className="text-sm font-bold text-red-700">Remover foto</button></form>}
        <p className="text-xs text-muted">Use uma foto em boa luz, de uniforme sem logomarca de outras empresas.</p>
      </aside>
      <aside className="card h-fit space-y-3">
        <p className="font-bold text-navy">Regiões atendidas</p>
        <ul className="space-y-1">{areas.map((a) => <li key={a.id} className="flex items-center justify-between rounded-lg bg-light px-3 py-2"><span className="font-bold">{a.name}</span><form action={deleteArea}><input type="hidden" name="id" value={a.id} /><button className="text-sm font-bold text-red-700">Remover</button></form></li>)}</ul>
        <ActionForm action={addArea} reset className="flex gap-2"><input name="name" placeholder="Bairro ou cidade" className="input" /><Submit className="btn-navy btn-sm" pending="...">Adicionar</Submit></ActionForm>
      </aside>
      </div>
    </div>
  );
}
