import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureSetup } from "@/lib/mentoria-server";
import { todayBR, addDays, dayKey, parseList, videoLink, KIND_LABEL } from "@/lib/mentoria";
import { undoTask } from "../actions";
import { DoneForm, RescheduleForm } from "../forms";
import { MentoriaTabs } from "../Tabs";
import { ScrollToToday } from "./ScrollToToday";

export const metadata = { title: "Mentoria · Semana" };
const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const KIND_BADGE: Record<string, string> = { TEORIA: "bg-blue-100 text-blue-800", QUESTOES: "bg-amber-100 text-amber-900", REVISAO: "bg-green-100 text-green-800", SIMULADO: "bg-brand text-navy" };

export default async function Semana(props: { searchParams: Promise<{ s?: string }> }) {
  const u = await requireAdmin();
  const plan = await ensureSetup(u.id);
  const off = Math.max(-52, Math.min(52, Number((await props.searchParams).s) || 0));
  const today = todayBR();
  const sunday = addDays(today, -today.getUTCDay() + off * 7);
  const [tasks, logs] = await Promise.all([
    prisma.studyTask.findMany({ where: { userId: u.id, date: { gte: sunday, lt: addDays(sunday, 7) } }, orderBy: [{ kind: "asc" }, { createdAt: "asc" }], include: { subject: { select: { name: true } }, topic: { select: { name: true, videoUrl: true } } } }),
    prisma.studyQuestionLog.findMany({ where: { userId: u.id, date: { gte: sunday, lt: addDays(sunday, 7) } }, select: { date: true, questions: true, correct: true } }),
  ]);
  const studyDays = parseList(plan.studyDays);
  const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  const totalMin = tasks.reduce((a, t) => a + t.minutes, 0), doneMin = tasks.filter((t) => t.status === "FEITO").reduce((a, t) => a + t.minutes, 0);

  return (
    <div className="space-y-5">
      <MentoriaTabs active="/admin/mentoria/semana" />
      <div className="flex items-center justify-between rounded-xl bg-white p-2">
        <Link href={`?s=${off - 1}`} className="btn-ghost btn-sm">← Anterior</Link>
        <span className="text-center"><b className="block text-navy">{off === 0 ? "Esta semana" : `${days[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })} a ${days[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}`}</b><span className="text-xs text-muted">{Math.floor(doneMin / 60)}h{String(doneMin % 60).padStart(2, "0")} de {Math.floor(totalMin / 60)}h{String(totalMin % 60).padStart(2, "0")} planejadas</span></span>
        <Link href={`?s=${off + 1}`} className="btn-ghost btn-sm">Próxima →</Link>
      </div>
      {off !== 0 && <div className="text-center"><Link href="?s=0" className="text-sm font-bold text-navy underline">Voltar para esta semana</Link></div>}

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0">
        {days.map((d) => {
          const k = dayKey(d), isToday = k === dayKey(today), past = d < today;
          const items = tasks.filter((t) => dayKey(t.date) === k);
          const q = logs.filter((l) => dayKey(l.date) === k), qn = q.reduce((a, l) => a + l.questions, 0);
          return (
            <section key={k} data-today={isToday ? "" : undefined} className="w-[82%] shrink-0 snap-start space-y-2 sm:w-[46%] lg:w-auto">
              <div className={`rounded-xl px-3 py-3 text-center ${isToday ? "bg-brand text-navy" : "bg-navy text-white"}`}>
                <p className="font-bold">{NOMES[d.getUTCDay()]}</p>
                <p className="text-sm opacity-80">{d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })}</p>
              </div>
              {qn > 0 && <p className="rounded-lg bg-white px-3 py-2 text-center text-xs font-bold text-navy">📝 {qn} questões lançadas</p>}
              {items.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted">{studyDays.includes(d.getUTCDay()) ? "Livre" : "Descanso"}</p>}
              {items.map((t) => {
                const late = past && t.status === "PENDENTE";
                return (
                  <article key={t.id} className={`rounded-xl p-3 text-sm ${late ? "bg-red-600 text-white" : t.status === "FEITO" ? "border border-green-200 bg-green-50" : "border border-line bg-white"}`}>
                    <p className={`text-xs font-bold ${late ? "text-white" : "text-navy"}`}>{t.subject?.name ?? KIND_LABEL[t.kind]}</p>
                    <p className={`mt-1 ${t.status === "FEITO" ? "line-through opacity-70" : ""} ${late ? "text-white" : "text-ink"}`}>{t.title.replace(/^[^:]+: /, "")}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`badge ${late ? "bg-white/20 text-white" : KIND_BADGE[t.kind]}`}>{KIND_LABEL[t.kind]}</span>
                      <span className={`badge ${late ? "bg-white/20 text-white" : "bg-light text-navy"}`}>{t.minutes} min</span>
                      {t.status === "FEITO" && <span className="badge bg-green-600 text-white">✓ feito</span>}
                      {late && <span className="badge bg-white text-red-700">atrasada</span>}
                    </div>
                    {t.status !== "FEITO" && t.kind !== "SIMULADO" && <a href={videoLink(t.topic?.name ?? t.title.replace(/^[^:]+: /, ""), t.subject?.name, t.topic?.videoUrl)} target="_blank" rel="noopener" className={`mt-2 inline-block text-xs font-bold hover:underline ${late ? "text-white" : "text-red-700"}`}>▶ Aula no YouTube</a>}
                    {t.status === "FEITO" ? (
                      <form action={undoTask} className="mt-2"><input type="hidden" name="id" value={t.id} /><button className="text-xs font-bold text-muted underline">desfazer</button></form>
                    ) : (
                      <details className="mt-2"><summary className={`cursor-pointer text-xs font-bold ${late ? "text-white" : "text-navy"}`}>marcar / reprogramar</summary>
                        <div className="mt-2 space-y-2 rounded-lg bg-white p-2 text-ink"><DoneForm id={t.id} simulado={t.kind === "SIMULADO"} /><RescheduleForm id={t.id} overdue={late} /></div>
                      </details>
                    )}
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted lg:hidden">Arraste para o lado para ver os outros dias</p>
      {off === 0 && <ScrollToToday />}
    </div>
  );
}
