import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { savePortfolioService, deletePortfolioService } from "../actions";
import type { PortfolioService } from "@prisma/client";

function F({ s }: { s?: PortfolioService }) {
  return (
    <ActionForm action={savePortfolioService} className="space-y-3" reset={!s}>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_90px]">
        <div><label className="label">Título</label><input name="title" defaultValue={s?.title} className="input" /></div>
        <div><label className="label">Endereço (URL)</label><input name="slug" defaultValue={s?.slug} className="input" placeholder="instalacao-de-chuveiro" /></div>
        <div><label className="label">Ordem</label><input name="sortOrder" type="number" defaultValue={s?.sortOrder ?? 0} className="input" /></div>
      </div>
      <div><label className="label">Resumo</label><input name="summary" defaultValue={s?.summary} className="input" /></div>
      <div><label className="label">Texto da página</label><textarea name="body" rows={4} defaultValue={s?.body} className="input" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Título no Google (até 70)</label><input name="seoTitle" defaultValue={s?.seoTitle ?? ""} maxLength={70} className="input" /></div>
        <div><label className="label">Descrição no Google (até 170)</label><input name="seoDescription" defaultValue={s?.seoDescription ?? ""} maxLength={170} className="input" /></div>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="published" defaultChecked={s?.published ?? false} className="h-4 w-4 accent-navy" /> Serviço confirmado — anunciar no site</label>
      <Submit className="btn-navy btn-sm">Salvar</Submit>
    </ActionForm>
  );
}
export default async function ServicosSite() {
  await requireAdmin();
  const list = await prisma.portfolioService.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-white p-4 text-sm text-muted">Só aparecem no site os serviços marcados como <b>confirmados</b>. Desmarque o que você não faz.</p>
      {list.map((s) => (
        <details key={s.id} className="card"><summary className="flex cursor-pointer items-center justify-between font-bold text-navy">{s.title}<span className={`badge ${s.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{s.published ? "No site" : "Oculto"}</span></summary>
          <div className="mt-4 space-y-3"><F s={s} /><form action={deletePortfolioService}><input type="hidden" name="id" value={s.id} /><ConfirmButton message="Excluir este serviço do site?" className="btn-danger btn-sm">Excluir</ConfirmButton></form></div>
        </details>
      ))}
      <div className="card"><p className="mb-3 font-bold text-navy">Novo serviço</p><F /></div>
    </div>
  );
}
