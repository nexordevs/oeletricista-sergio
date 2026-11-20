import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { brl } from "@/lib/money";
import { hasFeature } from "@/lib/access";
import { canWatch, embedUrl, ACCESS_LABEL } from "@/lib/aulas";
import { toggleLesson } from "../actions";
import { IconCheck, IconLock, IconPlay } from "@/components/icons";

export default async function Curso({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ a?: string }> }) {
  const { user, access } = await panelContext();
  const { slug } = await params; const { a } = await searchParams;
  const isAdmin = user.role === "ADMIN";
  const c = await prisma.course.findUnique({ where: { slug }, include: { lessons: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } });
  if (!c || (!c.published && !isAdmin)) notFound();
  if (!canWatch(c.access, { isAdmin, hasCourses: hasFeature(access, "courses") })) {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <IconLock className="mx-auto h-10 w-10 text-muted" />
        <p className="mt-3 text-xl font-bold text-navy">{c.title}</p>
        <p className="mt-1 text-muted">{c.lessons.length} aula(s) · {ACCESS_LABEL[c.access]}</p>
        {c.access === "SUBSCRIBERS"
          ? <><p className="mt-3 text-muted">As videoaulas fazem parte do plano Premium.</p><Link href="/painel/assinatura?plano=premium" className="btn-primary mt-5">Conhecer o Premium</Link></>
          : <p className="mt-3 font-bold text-navy">Este curso será vendido em breve{c.price ? ` por ${brl(c.price)}` : ""}. Fique de olho!</p>}
      </div>
    );
  }
  const done = new Set((await prisma.lessonProgress.findMany({ where: { userId: user.id, lessonId: { in: c.lessons.map((l) => l.id) } }, select: { lessonId: true } })).map((p) => p.lessonId));
  const current = c.lessons.find((l) => l.id === a) ?? c.lessons.find((l) => !done.has(l.id)) ?? c.lessons[0];
  if (!current) return <div className="card text-center text-muted">Este curso ainda não tem aulas.</div>;
  const idx = c.lessons.findIndex((l) => l.id === current.id), next = c.lessons[idx + 1];
  const src = embedUrl(current.videoUrl), feitas = c.lessons.filter((l) => done.has(l.id)).length;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <Link href="/painel/aulas" className="text-sm font-bold text-navy hover:underline">← Todos os cursos</Link>
        <div className="overflow-hidden rounded-2xl bg-black">
          {src ? <iframe src={src} title={current.title} className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            : <div className="flex aspect-video items-center justify-center text-white">Vídeo indisponível</div>}
        </div>
        <div className="card space-y-3">
          <p className="text-xs font-bold uppercase text-muted">{c.title} · Aula {idx + 1} de {c.lessons.length}</p>
          <p className="text-xl font-bold text-navy">{current.title}</p>
          {current.description && <p className="whitespace-pre-line text-ink/80">{current.description}</p>}
          {current.materialUrl && <a href={current.materialUrl} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">Material de apoio</a>}
          <div className="flex flex-wrap gap-2 pt-1">
            <form action={toggleLesson}><input type="hidden" name="lessonId" value={current.id} />
              <button className={done.has(current.id) ? "btn btn-sm bg-green-600 text-white hover:bg-green-700" : "btn-navy btn-sm"}>{done.has(current.id) ? "✓ Aula concluída" : "Concluí esta aula"}</button></form>
            {next && <Link href={`/painel/aulas/${c.slug}?a=${next.id}`} className="btn-primary btn-sm">Próxima aula →</Link>}
          </div>
        </div>
      </div>
      <aside className="card h-fit p-0 lg:sticky lg:top-6">
        <div className="border-b border-line p-4">
          <p className="font-bold text-navy">{c.title}</p>
          <div className="mt-2 h-2 rounded-full bg-light"><div className="h-2 rounded-full bg-brand" style={{ width: `${Math.round((feitas / c.lessons.length) * 100)}%` }} /></div>
          <p className="mt-1 text-xs text-muted">{feitas} de {c.lessons.length} concluída(s)</p>
        </div>
        <ol className="max-h-[60vh] overflow-y-auto">
          {c.lessons.map((l, i) => (
            <li key={l.id}><Link href={`/painel/aulas/${c.slug}?a=${l.id}`} className={`flex items-center gap-3 border-b border-line px-4 py-3 text-sm last:border-0 ${l.id === current.id ? "bg-light font-bold" : "hover:bg-light"}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done.has(l.id) ? "bg-green-600 text-white" : l.id === current.id ? "bg-brand text-navy" : "bg-light text-muted"}`}>{done.has(l.id) ? <IconCheck className="h-4 w-4" /> : l.id === current.id ? <IconPlay className="h-3.5 w-3.5" /> : i + 1}</span>
              <span className="flex-1 text-navy">{l.title}</span>{l.durationMin ? <span className="text-xs text-muted">{l.durationMin} min</span> : null}
            </Link></li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
