import type { Course } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { saveCourse } from "../actions";
export function CourseForm({ c }: { c?: Course }) {
  return (
    <ActionForm action={saveCourse} className="space-y-3" reset={!c}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div><label className="label">Título do curso</label><input name="title" defaultValue={c?.title} className="input" placeholder="Ex.: Quadro de distribuição na prática" /></div>
      <div><label className="label">Descrição</label><textarea name="description" rows={3} defaultValue={c?.description ?? ""} className="input" placeholder="O que o eletricista vai aprender" /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label">Quem pode assistir</label><select name="access" defaultValue={c?.access ?? "SUBSCRIBERS"} className="input">
          <option value="FREE">Grátis (todo cadastrado)</option><option value="SUBSCRIBERS">Assinantes</option><option value="PAID">Curso pago (em breve)</option></select></div>
        <div><label className="label">Preço (curso pago)</label><input name="price" defaultValue={c?.price ? Number(c.price).toFixed(2).replace(".", ",") : ""} inputMode="decimal" className="input" placeholder="Ex.: 97,00" /></div>
        <div><label className="label">Ordem</label><input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className="input" /></div>
      </div>
      <div><label className="label">Endereço (opcional)</label><input name="slug" defaultValue={c?.slug} className="input" placeholder="gerado a partir do título" /></div>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="published" defaultChecked={c?.published ?? false} className="h-4 w-4 accent-navy" /> Publicado (aparece para os eletricistas)</label>
      <Submit className="btn-primary">{c ? "Salvar curso" : "Criar curso"}</Submit>
    </ActionForm>
  );
}
