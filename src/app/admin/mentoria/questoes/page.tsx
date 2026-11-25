import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/money";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ensureSetup } from "@/lib/mentoria-server";
import { todayBR, addDays, dayKey } from "@/lib/mentoria";
import { deleteQuestionLog } from "../actions";
import { QuestionLogForm } from "../forms";
import { QuestionsChart } from "../Graficos";
import { MentoriaTabs } from "../Tabs";

export const metadata = { title: "Mentoria · Questões" };
const WEEK = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function Questoes() {
  const u = await requireAdmin();
  const plan = await ensureSetup(u.id);
  const today = todayBR(), weekStart = addDays(today, -((today.getUTCDay() + 6) % 7));
  const [subjects, logs, taskQ] = await Promise.all([
    prisma.studySubject.findMany({ where: { userId: u.id }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { topics: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } } } }),
    prisma.studyQuestionLog.findMany({ where: { userId: u.id }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], include: { subject: { select: { name: true } }, topic: { select: { name: true } } } }),
    prisma.studyTask.findMany({ where: { userId: u.id, status: "FEITO", questions: { gt: 0 } }, select: { date: true, subjectId: true, questions: true, correct: true, kind: true } }),
  ]);
  // tudo que tem questões: lançamentos + tarefas concluídas com questões
  const all = [...logs.map((l) => ({ date: l.date, subjectId: l.subjectId, q: l.questions, c: l.correct })), ...taskQ.map((t) => ({ date: t.date, subjectId: t.subjectId, q: t.questions ?? 0, c: t.correct ?? 0 }))];
  const sum = (xs: typeof all) => ({ q: xs.reduce((a, x) => a + x.q, 0), c: xs.reduce((a, x) => a + x.c, 0) });
  const pct = (x: { q: number; c: number }) => (x.q ? Math.round((x.c / x.q) * 100) : null);
  const hoje = sum(all.filter((x) => dayKey(x.date) === dayKey(today)));
  const semana = sum(all.filter((x) => x.date >= weekStart));
  const total = sum(all);
  const bySub = subjects.map((s) => ({ ...s, ...sum(all.filter((x) => x.subjectId === s.id)) })).filter((s) => s.q > 0).sort((a, b) => (pct(a) ?? 0) - (pct(b) ?? 0));
  const days = Array.from({ length: 14 }, (_, i) => { const d = addDays(today, i - 13); const s = sum(all.filter((x) => dayKey(x.date) === dayKey(d))); return { label: WEEK[d.getUTCDay()], correct: s.c, wrong: s.q - s.c, today: i === 13 }; });
  const weekPct = plan.weeklyQuestions ? Math.min(100, Math.round((semana.q / plan.weeklyQuestions) * 100)) : 0;

  return (
    <div className="space-y-5">
      <MentoriaTabs active="/admin/mentoria/questoes" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card"><p className="text-xs font-bold uppercase text-muted">Hoje</p><p className="mt-1 text-2xl font-bold text-navy">{hoje.q}</p><p className="text-xs text-muted">{hoje.q ? `${pct(hoje)}% de acerto` : "nenhuma ainda"}</p></div>
        <div className="card"><p className="text-xs font-bold uppercase text-muted">Semana</p><p className="mt-1 text-2xl font-bold text-navy">{semana.q} <span className="text-sm font-normal text-muted">/ {plan.weeklyQuestions}</span></p>
          <div className="viz mt-2 h-2 overflow-hidden rounded-full bg-light"><div className="h-full rounded-full" style={{ width: `${weekPct}%`, background: weekPct >= 100 ? "var(--s3)" : "var(--s1)" }} /></div></div>
        <div className="card"><p className="text-xs font-bold uppercase text-muted">Total resolvidas</p><p className="mt-1 text-2xl font-bold text-navy">{total.q.toLocaleString("pt-BR")}</p><p className="text-xs text-muted">{total.c.toLocaleString("pt-BR")} acertos</p></div>
        <div className="card border-l-4 border-l-brand"><p className="text-xs font-bold uppercase text-muted">Taxa de acertos</p><p className="mt-1 text-2xl font-bold text-navy">{pct(total) != null ? `${pct(total)}%` : "—"}</p>{pct(total) != null && <p className={`text-xs font-bold ${pct(total)! >= 50 ? "text-green-700" : "text-red-700"}`}>{pct(total)! >= 50 ? "✓ acima dos 50% da prova" : "⚠ abaixo dos 50% da prova"}</p>}</div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <aside className="order-first space-y-5 lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-6 lg:h-fit">
          <section className="card"><p className="mb-3 text-lg font-bold text-navy">Lançar questões</p><QuestionLogForm subjects={subjects} today={dayKey(today)} /></section>
        </aside>
        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
          <section className="card">
            <p className="text-lg font-bold text-navy">Desempenho por matéria</p>
            <p className="mb-3 text-sm text-muted">Da pior para a melhor. Na prova é preciso <b className="text-ink">40% em cada matéria</b> (linha tracejada).</p>
            {bySub.length === 0 ? <p className="text-sm text-muted">Lance questões para ver seu desempenho em cada matéria.</p> : (
              <ul className="viz space-y-3">{bySub.map((s) => {
                const p = pct(s)!;
                return (
                  <li key={s.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm"><b className="text-navy">{s.name}</b><span className="shrink-0 text-muted"><b className="text-ink">{p}%</b> · {s.c}/{s.q}{p < 40 && <b className="ml-1 text-red-700">⚠ abaixo de 40%</b>}</span></div>
                    <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-light"><div className="h-full rounded-full" style={{ width: `${p}%`, background: p >= 40 ? "var(--s1)" : "var(--s2)" }} /><span className="absolute inset-y-0 border-l-2 border-dashed border-muted" style={{ left: "40%" }} aria-hidden /></div>
                  </li>);
              })}</ul>
            )}
          </section>
          <section className="card"><p className="text-lg font-bold text-navy">Questões por dia · 14 dias</p><p className="mb-2 text-sm text-muted">Passe o dedo nas colunas para ver os números</p><QuestionsChart days={days} /></section>
          <section className="card p-0">
            <p className="px-5 py-4 text-lg font-bold text-navy">Histórico de lançamentos</p>
            {logs.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">Nenhum lançamento ainda.</p> : (
              <ul className="divide-y divide-line">{logs.slice(0, 60).map((l) => {
                const p = Math.round((l.correct / l.questions) * 100);
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0"><b className="block text-navy">{l.subject?.name ?? "Sem matéria"}{l.topic ? <span className="font-normal text-muted"> · {l.topic.name}</span> : ""}</b>
                      <span className="text-xs text-muted">{fmtDate(l.date)}{l.source ? ` · ${l.source}` : ""}{l.minutes ? ` · ${l.minutes} min` : ""}{l.note ? ` · ${l.note}` : ""}</span></span>
                    <span className="flex shrink-0 items-center gap-3"><span className="text-right"><b className={p >= 50 ? "text-green-700" : p >= 40 ? "text-ink" : "text-red-700"}>{p}%</b><span className="block text-xs text-muted">{l.correct}/{l.questions}</span></span>
                      <form action={deleteQuestionLog}><input type="hidden" name="id" value={l.id} /><ConfirmButton message="Excluir este lançamento?" className="text-xs text-muted hover:text-red-700">✕</ConfirmButton></form></span>
                  </li>);
              })}</ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
