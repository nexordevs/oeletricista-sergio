import Link from "next/link";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { hasFeature } from "@/lib/access";
import { ACCESS_LABEL, canWatch } from "@/lib/aulas";
import { IconPlay, IconLock } from "@/components/icons";

export default async function Aulas() {
  const { user, access } = await panelContext();
  const isAdmin = user.role === "ADMIN";
  const courses = await prisma.course.findMany({ where: isAdmin ? {} : { published: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { lessons: { select: { id: true, durationMin: true } } } });
  const done = new Set((await prisma.lessonProgress.findMany({ where: { userId: user.id }, select: { lessonId: true } })).map((p) => p.lessonId));
  if (courses.length === 0) return <div className="card mx-auto max-w-lg text-center"><IconPlay className="mx-auto h-10 w-10 text-muted" /><p className="mt-3 text-lg font-bold text-navy">As videoaulas estão chegando!</p><p className="mt-1 text-muted">Em breve você vai encontrar aqui cursos práticos para eletricistas.</p></div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => {
        const can = canWatch(c.access, { isAdmin, hasCourses: hasFeature(access, "courses") });
        const total = c.lessons.length, feitas = c.lessons.filter((l) => done.has(l.id)).length;
        const min = c.lessons.reduce((a, l) => a + (l.durationMin || 0), 0);
        return (
          <Link key={c.id} href={`/painel/aulas/${c.slug}`} className="card flex flex-col overflow-hidden p-0 transition hover:border-brand">
            <div className="relative flex h-32 items-center justify-center bg-navy">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-navy">{can ? <IconPlay className="h-7 w-7" /> : <IconLock className="h-7 w-7" />}</span>
              <span className={`badge absolute left-3 top-3 ${c.access === "FREE" ? "bg-green-500 text-white" : c.access === "PAID" ? "bg-white text-navy" : "bg-brand text-navy"}`}>{ACCESS_LABEL[c.access]}{c.access === "PAID" && !can ? " · em breve" : ""}</span>
              {isAdmin && !c.published && <span className="badge absolute right-3 top-3 bg-gray-200 text-gray-700">Rascunho</span>}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="font-bold text-navy">{c.title}</p>
              {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>}
              <p className="mt-3 text-xs font-bold text-muted">{total} aula(s){min ? ` · ${min} min` : ""}</p>
              {can && total > 0 && <div className="mt-2"><div className="h-2 rounded-full bg-light"><div className="h-2 rounded-full bg-brand" style={{ width: `${Math.round((feitas / total) * 100)}%` }} /></div><p className="mt-1 text-xs text-muted">{feitas} de {total} concluída(s)</p></div>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
