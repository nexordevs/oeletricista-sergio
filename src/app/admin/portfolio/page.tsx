import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { saveWork, deleteWork, deletePhoto } from "../actions";

function Fields({ w, services }: { w?: { id: string; title: string; description: string | null; neighborhood: string | null; serviceSlug: string | null; published: boolean }; services: { slug: string; title: string }[] }) {
  return (
    <>
      {w && <input type="hidden" name="id" value={w.id} />}
      <div><label className="label">Título</label><input name="title" defaultValue={w?.title} className="input" placeholder="Ex.: Troca de quadro elétrico" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Bairro (opcional)</label><input name="neighborhood" defaultValue={w?.neighborhood ?? ""} className="input" /></div>
        <div><label className="label">Serviço relacionado</label><select name="serviceSlug" defaultValue={w?.serviceSlug ?? ""} className="input"><option value="">—</option>{services.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}</select></div>
      </div>
      <div><label className="label">Descrição</label><textarea name="description" rows={2} defaultValue={w?.description ?? ""} className="input" /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["ANTES", "Fotos de antes"], ["DEPOIS", "Fotos de depois"], ["GERAL", "Outras fotos"]].map(([k, l]) => <div key={k}><label className="label">{l}</label><input type="file" name={`photos_${k}`} multiple accept="image/png,image/jpeg,image/webp" className="block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:font-bold file:text-white" /></div>)}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={w?.published ?? true} className="h-4 w-4 accent-navy" /> Mostrar no site</label>
    </>
  );
}

export default async function AdminPortfolio() {
  await requireAdmin();
  const [works, services] = await Promise.all([
    prisma.portfolioWork.findMany({ orderBy: { createdAt: "desc" }, include: { photos: { select: { id: true, kind: true }, orderBy: { position: "asc" } } } }),
    prisma.portfolioService.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, title: true } }),
  ]);
  return (
    <div className="space-y-6">
      <ActionForm action={saveWork} className="card space-y-3" reset><p className="text-lg font-bold text-navy">Cadastrar trabalho realizado</p><Fields services={services} /><Submit className="btn-primary" pending="Enviando fotos...">Cadastrar</Submit></ActionForm>
      {works.map((w) => (
        <div key={w.id} className="card space-y-3">
          <div className="flex flex-wrap gap-2">{w.photos.map((p) => (
            <div key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/admin/portfolio/foto/${p.id}`} alt="" className="h-24 w-32 rounded-lg object-cover" />
              <span className="badge absolute left-1 top-1 bg-navy text-[10px] text-white">{p.kind}</span>
              <form action={deletePhoto} className="absolute right-1 top-1"><input type="hidden" name="id" value={p.id} /><ConfirmButton message="Excluir foto?" className="rounded bg-white/90 px-1.5 text-xs font-bold text-red-700">×</ConfirmButton></form>
            </div>))}{w.photos.length === 0 && <p className="text-sm text-muted">Sem fotos.</p>}</div>
          <ActionForm action={saveWork} className="space-y-3"><Fields w={w} services={services} /><div className="flex gap-2"><Submit className="btn-navy btn-sm">Salvar</Submit></div></ActionForm>
          <form action={deleteWork}><input type="hidden" name="id" value={w.id} /><ConfirmButton message="Excluir este trabalho e as fotos?" className="btn-danger btn-sm">Excluir trabalho</ConfirmButton></form>
        </div>
      ))}
    </div>
  );
}
