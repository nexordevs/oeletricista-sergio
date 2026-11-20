import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ACCESS_LABEL } from "@/lib/aulas";
import { CourseForm } from "./CourseForm";
export default async function AdminAulas() {
  await requireAdmin();
  const courses = await prisma.course.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { lessons: true } } } });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-3">
        <p className="rounded-xl bg-white p-4 text-sm text-muted">Suba os vídeos no <b>YouTube como “Não listado”</b> (grátis) ou no <b>Vimeo/Panda Video</b> (recomendado para curso pago, protege contra cópia) e cole o link em cada aula.</p>
        {courses.length === 0 && <div className="card text-center text-muted">Nenhum curso ainda. Crie o primeiro ao lado.</div>}
        {courses.map((c) => (
          <Link key={c.id} href={`/admin/aulas/${c.id}`} className="card flex items-center justify-between gap-3 hover:border-brand">
            <span><b className="block text-navy">{c.title}</b><span className="text-sm text-muted">{c._count.lessons} aula(s) · {ACCESS_LABEL[c.access]}</span></span>
            <span className={`badge ${c.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{c.published ? "Publicado" : "Rascunho"}</span>
          </Link>
        ))}
      </div>
      <aside className="card h-fit"><p className="mb-3 text-lg font-bold text-navy">Novo curso</p><CourseForm /></aside>
    </div>
  );
}
