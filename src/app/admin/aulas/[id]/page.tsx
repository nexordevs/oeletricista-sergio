import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { Submit } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { saveLesson, deleteLesson, deleteCourse } from "../../actions";
import { CourseForm } from "../CourseForm";
import type { Lesson } from "@prisma/client";

function LessonFields({ l, courseId, next }: { l?: Lesson; courseId: string; next: number }) {
  return (
    <>
      {l && <input type="hidden" name="id" value={l.id} />}<input type="hidden" name="courseId" value={courseId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_90px]">
        <div><label className="label">Título da aula</label><input name="title" defaultValue={l?.title} className="input" /></div>
        <div><label className="label">Duração (min)</label><input name="durationMin" defaultValue={l?.durationMin ?? ""} inputMode="numeric" className="input" /></div>
        <div><label className="label">Ordem</label><input name="sortOrder" type="number" defaultValue={l?.sortOrder ?? next} className="input" /></div>
      </div>
      <div><label className="label">Link do vídeo (YouTube, Vimeo ou Panda)</label><input name="videoUrl" defaultValue={l?.videoUrl} className="input" placeholder="https://youtu.be/…" /></div>
      <div><label className="label">Descrição / resumo da aula</label><textarea name="description" rows={2} defaultValue={l?.description ?? ""} className="input" /></div>
      <div><label className="label">Material de apoio (link, opcional)</label><input name="materialUrl" defaultValue={l?.materialUrl ?? ""} className="input" placeholder="https://… (PDF no Google Drive, por exemplo)" /></div>
    </>
  );
}
export default async function AdminCurso({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const c = await prisma.course.findUnique({ where: { id }, include: { lessons: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } });
  if (!c) notFound();
  const next = (c.lessons.at(-1)?.sortOrder ?? 0) + 1;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        <Link href="/admin/aulas" className="text-sm font-bold text-navy hover:underline">← Todos os cursos</Link>
        <p className="text-xl font-bold text-navy">Aulas de “{c.title}”</p>
        {c.lessons.map((l) => (
          <details key={l.id} className="card"><summary className="cursor-pointer font-bold text-navy">{l.sortOrder}. {l.title} {l.durationMin ? <span className="font-normal text-muted">· {l.durationMin} min</span> : null}</summary>
            <ActionForm action={saveLesson} className="mt-4 space-y-3"><LessonFields l={l} courseId={c.id} next={next} /><Submit className="btn-navy btn-sm">Salvar aula</Submit></ActionForm>
            <form action={deleteLesson} className="mt-2"><input type="hidden" name="id" value={l.id} /><ConfirmButton message="Excluir esta aula?" className="btn-danger btn-sm">Excluir aula</ConfirmButton></form>
          </details>
        ))}
        <div className="card"><p className="mb-3 font-bold text-navy">Adicionar aula</p><ActionForm action={saveLesson} className="space-y-3" reset><LessonFields courseId={c.id} next={next} /><Submit className="btn-primary">Adicionar aula</Submit></ActionForm></div>
      </div>
      <aside className="space-y-4">
        <div className="card"><p className="mb-3 text-lg font-bold text-navy">Dados do curso</p><CourseForm c={c} /></div>
        <form action={deleteCourse}><input type="hidden" name="id" value={c.id} /><ConfirmButton message="Excluir o curso e todas as aulas?" className="btn-danger btn-sm w-full">Excluir curso</ConfirmButton></form>
      </aside>
    </div>
  );
}
