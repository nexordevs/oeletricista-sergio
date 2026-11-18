import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { saveTestimonial, deleteTestimonial } from "../actions";
import type { Testimonial } from "@prisma/client";
function F({ t }: { t?: Testimonial }) {
  return (
    <ActionForm action={saveTestimonial} className="space-y-3" reset={!t}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_110px]">
        <div><label className="label">Nome do cliente</label><input name="authorName" defaultValue={t?.authorName} className="input" /></div>
        <div><label className="label">Bairro</label><input name="neighborhood" defaultValue={t?.neighborhood ?? ""} className="input" /></div>
        <div><label className="label">Estrelas</label><select name="rating" defaultValue={t?.rating ?? 5} className="input">{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></div>
      </div>
      <div><label className="label">Depoimento</label><textarea name="text" rows={3} defaultValue={t?.text} className="input" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={t?.published ?? true} className="h-4 w-4 accent-navy" /> Mostrar no site</label>
      <Submit className="btn-navy btn-sm">Salvar</Submit>
    </ActionForm>
  );
}
export default async function Depoimentos() {
  await requireAdmin();
  const list = await prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-white p-4 text-sm text-muted">Cadastre apenas depoimentos reais, com autorização do cliente.</p>
      <div className="card"><p className="mb-3 font-bold text-navy">Novo depoimento</p><F /></div>
      {list.map((t) => <div key={t.id} className="card space-y-3"><F t={t} /><form action={deleteTestimonial}><input type="hidden" name="id" value={t.id} /><ConfirmButton message="Excluir depoimento?" className="btn-danger btn-sm">Excluir</ConfirmButton></form></div>)}
    </div>
  );
}
