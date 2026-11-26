import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/money";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ensureSetup, buildSchedule } from "@/lib/mentoria-server";
import { todayBR, addDays, dayKey, parseList, streak, minutesByDay, fmtHours, videoLink, DIAS, KIND_LABEL } from "@/lib/mentoria";
import { generateSchedule, rebuildSchedule, setTopicVideo, undoTask, deleteTask, rescheduleLate, toggleTopic, deleteTopic, deleteSubject } from "./actions";
import { PlanForm, DoneForm, RescheduleForm, AddTaskForm, SubjectForm, TopicForm, EditalImportForm } from "./forms";
import { HoursChart, SimuladosChart } from "./Graficos";
import { MentoriaTabs } from "./Tabs";

export const metadata = { title: "Mentoria de estudos" };
const hm = (m: number) => `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, "0")}`;
const KIND_STYLE: Record<string, string> = { TEORIA: "bg-blue-100 text-blue-800", QUESTOES: "bg-amber-100 text-amber-900", REVISAO: "bg-green-100 text-green-800", SIMULADO: "bg-navy text-white" };
const WEEK = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function Mentoria() {
  const u = await requireAdmin();
  const plan = await ensureSetup(u.id);
  const today = todayBR(), tk = dayKey(today);
  // sem nada agendado daqui pra frente: monta o cronograma sozinho (14 dias)
  if ((await prisma.studyTask.count({ where: { userId: u.id, status: "PENDENTE", date: { gte: today } } })) === 0) await buildSchedule(u.id, 14);
  const weekStart = addDays(today, -((today.getUTCDay() + 6) % 7)); // segunda-feira
  const [tasks, late, doneAll, subjects, simulados] = await Promise.all([
    prisma.studyTask.findMany({ where: { userId: u.id, date: { gte: today, lt: addDays(today, 8) } }, orderBy: [{ date: "asc" }, { kind: "asc" }, { createdAt: "asc" }], include: { subject: { select: { name: true } }, topic: { select: { name: true, videoUrl: true } } } }),
    prisma.studyTask.findMany({ where: { userId: u.id, status: "PENDENTE", date: { lt: today } }, orderBy: { date: "asc" }, include: { subject: { select: { name: true } }, topic: { select: { name: true, videoUrl: true } } } }),
    prisma.studyTask.findMany({ where: { userId: u.id, status: "FEITO", doneAt: { gte: addDays(today, -120) } }, select: { doneAt: true, minutes: true, questions: true, correct: true, subjectId: true, kind: true } }),
    prisma.studySubject.findMany({ where: { userId: u.id }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { topics: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } } }),
    prisma.studyTask.findMany({ where: { userId: u.id, kind: "SIMULADO", status: "FEITO", questions: { gt: 0 } }, orderBy: { date: "asc" }, take: 20 }),
  ]);
  const studyDays = parseList(plan.studyDays);
  // questões lançadas na aba Questões contam nas metas, acertos, horas e sequência
  const qlogs = await prisma.studyQuestionLog.findMany({ where: { userId: u.id, date: { gte: addDays(today, -120) } }, select: { date: true, minutes: true, questions: true, correct: true, subjectId: true } });
  const activity = [...doneAll.map((t) => ({ day: t.doneAt ? dayKey(todayBR(t.doneAt)) : "", minutes: t.minutes, questions: t.questions ?? 0, correct: t.correct ?? 0, subjectId: t.subjectId })),
    ...qlogs.map((l) => ({ day: dayKey(l.date), minutes: l.minutes ?? 0, questions: l.questions, correct: l.correct, subjectId: l.subjectId }))];

  // indicadores
  const minutesOn = (k: string) => activity.filter((t) => t.day === k).reduce((a, t) => a + t.minutes, 0);
  const weekDone = activity.filter((t) => t.day && t.day >= dayKey(weekStart));
  const weekMin = weekDone.reduce((a, t) => a + t.minutes, 0);
  const dayMin = minutesByDay(plan);
  const todayGoal = dayMin[today.getUTCDay()];
  const weekGoalMin = dayMin.reduce((a, m) => a + m, 0);
  const weekQ = weekDone.reduce((a, t) => a + (t.questions ?? 0), 0);
  const allQ = activity.reduce((a, t) => a + t.questions, 0), allC = activity.reduce((a, t) => a + t.correct, 0);
  const acc = allQ > 0 ? Math.round((allC / allQ) * 100) : null;
  const activeDays = new Set(activity.filter((t) => t.day).map((t) => t.day));
  const seq = streak(activeDays, today);
  const sunday = addDays(today, -today.getUTCDay());
  const weekDots = Array.from({ length: 7 }, (_, i) => { const d = addDays(sunday, i), k = dayKey(d);
    return { l: "DSTQQSS"[i], state: activeDays.has(k) ? "ok" : k === dayKey(today) ? "hoje" : d > today ? "futuro" : k < dayKey(plan.startDate ?? today) ? "descanso" : studyDays.includes(i) ? "faltou" : "descanso" }; });
  const todayTasks = tasks.filter((t) => dayKey(t.date) === tk);
  const todayDone = todayTasks.filter((t) => t.status === "FEITO").length;
  const todayMin = minutesOn(tk);
  const daysLeft = plan.examDate ? Math.ceil((plan.examDate.getTime() - today.getTime()) / 864e5) : null;
  const totalTopics = subjects.reduce((a, s) => a + s.topics.length, 0), seenTopics = subjects.reduce((a, s) => a + s.topics.filter((t) => t.studiedAt).length, 0);
  const upcoming = [1, 2, 3, 4, 5, 6, 7].map((i) => { const d = addDays(today, i); return { d, items: tasks.filter((t) => dayKey(t.date) === dayKey(d)) }; });
  const hours = Array.from({ length: 14 }, (_, i) => { const d = addDays(today, i - 13); return { label: i === 13 ? "hoje" : `${WEEK[d.getUTCDay()]}`, minutes: minutesOn(dayKey(d)), today: i === 13 }; });
  const simPts = simulados.map((s) => ({ label: fmtDate(s.date).slice(0, 5), pct: Math.round(((s.correct ?? 0) / (s.questions || 1)) * 100), detail: `${s.correct ?? 0} de ${s.questions} questões` }));
  const accBy = (id: string) => { const ts = activity.filter((t) => t.subjectId === id && t.questions > 0); const q = ts.reduce((a, t) => a + t.questions, 0); return q ? Math.round((ts.reduce((a, t) => a + t.correct, 0) / q) * 100) : null; };
  const subjOpts = subjects.map((s) => ({ id: s.id, name: s.name }));

  const Meter = ({ label, value, goal, fmt }: { label: string; value: number; goal: number; fmt: (n: number) => string }) => {
    const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
    return (
      <div className="card">
        <p className="text-xs font-bold uppercase text-muted">{label}</p>
        <p className="mt-1 text-xl font-bold text-navy">{fmt(value)} <span className="text-sm font-normal text-muted">/ {fmt(goal)}</span></p>
        <div className="viz mt-2 h-2.5 overflow-hidden rounded-full bg-light"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? "var(--s3)" : "var(--s1)" }} /></div>
        <p className="mt-1 text-xs text-muted">{pct}% da meta</p>
      </div>
    );
  };
  const TaskRow = ({ t, showDate, overdue }: { t: (typeof tasks)[number]; showDate?: boolean; overdue?: boolean }) => (
    <li className={`px-5 py-3 ${t.status === "FEITO" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={`badge ${KIND_STYLE[t.kind]}`}>{KIND_LABEL[t.kind]}</span>
          <span className="ml-2 text-xs text-muted">{t.minutes} min{showDate ? ` · ${fmtDate(t.date)}` : ""}{t.rescheduledCount > 0 ? ` · reprogramada ${t.rescheduledCount}x` : ""}</span>
          {t.subject && <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">{t.subject.name}</p>}
          <p className={`font-bold text-navy ${t.subject ? "" : "mt-1"} ${t.status === "FEITO" ? "line-through" : ""}`}>{t.subject ? t.title.replace(/^[^:]+: /, "") : t.title}</p>
          {t.status !== "FEITO" && t.kind !== "SIMULADO" && <a href={videoLink(t.topic?.name ?? t.title.replace(/^[^:]+: /, ""), t.subject?.name, t.topic?.videoUrl)} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:underline">▶ {t.topic?.videoUrl ? "Assistir a aula escolhida" : "Aula no YouTube"}</a>}
          {t.status === "FEITO" && t.questions != null && <p className="text-xs text-muted">{t.correct ?? 0} de {t.questions} questões ({t.questions ? Math.round(((t.correct ?? 0) / t.questions) * 100) : 0}%)</p>}
        </div>
        {t.status === "FEITO"
          ? <form action={undoTask}><input type="hidden" name="id" value={t.id} /><button className="text-xs font-bold text-muted underline">desfazer</button></form>
          : <DoneForm id={t.id} simulado={t.kind === "SIMULADO"} />}
      </div>
      {t.status !== "FEITO" && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <RescheduleForm id={t.id} overdue={overdue} />
          <form action={deleteTask}><input type="hidden" name="id" value={t.id} /><ConfirmButton message="Excluir esta tarefa?" className="text-xs font-bold text-muted hover:text-red-700">excluir</ConfirmButton></form>
        </div>
      )}
    </li>
  );

  return (
    <div className="space-y-5">
      <MentoriaTabs active="/admin/mentoria" />
      {/* TOPO */}
      <section className="rounded-2xl bg-navy p-5 text-white sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Mentoria · só você vê</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{plan.title}</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/10 p-3"><p className="text-2xl font-bold text-brand sm:text-3xl">{daysLeft != null ? Math.max(0, daysLeft) : "—"}</p><p className="text-xs text-navy-soft">{daysLeft != null ? "dias para a prova" : "defina a data da prova"}</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-2xl font-bold text-brand sm:text-3xl">🔥 {seq}</p><p className="text-xs text-navy-soft">{seq === 1 ? "dia seguido" : "dias seguidos"}</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-2xl font-bold text-brand sm:text-3xl">{totalTopics ? Math.round((seenTopics / totalTopics) * 100) : 0}%</p><p className="text-xs text-navy-soft">do edital estudado</p></div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3" aria-label="Sequência da semana">
          {weekDots.map((d, i) => (
            <div key={i} className="text-center">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold sm:h-10 sm:w-10 ${d.state === "ok" ? "border-brand bg-brand text-navy" : d.state === "hoje" ? "border-brand text-brand" : d.state === "faltou" ? "border-white/40 text-white/60" : "border-white/20 text-white/30"}`} title={{ ok: "estudou", hoje: "hoje", faltou: "não estudou", futuro: "", descanso: "descanso" }[d.state]}>{d.state === "ok" ? "✓" : d.state === "faltou" ? "✗" : d.state === "descanso" ? "–" : ""}</span>
              <span className="mt-1 block text-xs text-navy-soft">{d.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* METAS */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Meter label={todayGoal > 0 ? "Hoje" : "Hoje (descanso)"} value={todayMin} goal={todayGoal} fmt={hm} />
        <Meter label="Horas na semana" value={weekMin} goal={weekGoalMin} fmt={hm} />
        <Meter label="Questões na semana" value={weekQ} goal={plan.weeklyQuestions} fmt={(n) => String(n)} />
        <div className="card"><p className="text-xs font-bold uppercase text-muted">Acerto geral</p><p className="mt-1 text-xl font-bold text-navy">{acc != null ? `${acc}%` : "—"}</p><p className="mt-1 text-xs text-muted">{allQ ? `${allC} de ${allQ} questões (120 dias)` : <>lance na aba <a href="/admin/mentoria/questoes" className="font-bold underline">Questões</a></>}</p>{acc != null && acc < 50 && <p className="mt-1 text-xs font-bold text-red-700">abaixo dos 50% da prova</p>}</div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* ATRASADAS */}
          {late.length > 0 && (
            <section className="card border-red-200 p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                <p className="text-lg font-bold text-red-700">⚠ {late.length} {late.length === 1 ? "tarefa atrasada" : "tarefas atrasadas"}</p>
                <form action={rescheduleLate} className="flex gap-2"><button name="mode" value="hoje" className="btn-outline btn-sm">Tudo para hoje</button><button name="mode" value="espalhar" className="btn-navy btn-sm">Reprogramar (2 por dia)</button></form>
              </div>
              <ul className="divide-y divide-line">{late.map((t) => <TaskRow key={t.id} t={t} showDate overdue />)}</ul>
            </section>
          )}

          {/* HOJE */}
          <section className="card p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <p className="text-lg font-bold text-navy">O que estudar hoje <span className="text-sm font-normal capitalize text-muted">· {today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" })}</span></p>
              {todayTasks.length > 0 && <span className="badge bg-light text-navy">{todayDone}/{todayTasks.length} feitas</span>}
            </div>
            {todayTasks.length === 0 ? (
              <div className="px-5 pb-5 text-sm text-muted">{dayMin[today.getUTCDay()] > 0 ? "Nada agendado para hoje." : "Hoje é folga no seu plano. 😴"} Para estudar hoje, toque em “Refazer cronograma” ou adicione uma tarefa.</div>
            ) : <ul className="divide-y divide-line">{todayTasks.map((t) => <TaskRow key={t.id} t={t} />)}</ul>}
            {todayTasks.length > 0 && todayDone === todayTasks.length && <p className="border-t border-line px-5 py-3 text-sm font-bold text-green-700">🏆 Tudo feito hoje! Mandou bem, Sergio.</p>}
          </section>

          {/* MINHAS HORAS */}
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-lg font-bold text-navy">Minhas horas de estudo</p><a href="#plano" className="text-sm font-bold text-navy underline">editar horas</a></div>
            <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">{DIAS.map((d, i) => (
              <div key={d} className={`rounded-xl py-2 ${i === today.getUTCDay() ? "ring-2 ring-brand" : ""} ${dayMin[i] > 0 ? "bg-navy text-white" : "bg-light text-muted"}`}>
                <p className="text-[11px] font-bold uppercase opacity-80">{d}</p><p className="text-sm font-bold">{dayMin[i] > 0 ? fmtHours(dayMin[i]) : "folga"}</p>
              </div>))}</div>
            <p className="mt-2 text-sm text-muted">Total: <b className="text-ink">{fmtHours(weekGoalMin)} por semana</b> · blocos de {plan.blockMinutes} min{!plan.dayMinutes && <b className="text-red-700"> · confira suas horas em “Plano e metas”</b>}</p>
          </section>

          {/* CRONOGRAMA */}
          <section className="card p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <p className="text-lg font-bold text-navy">Próximos 7 dias</p>
              <div className="flex flex-wrap gap-2">
                <form action={generateSchedule} className="flex gap-2"><button name="days" value="7" className="btn-primary btn-sm">Gerar 7 dias</button><button name="days" value="30" className="btn-outline btn-sm">30 dias</button></form>
                <form action={rebuildSchedule}><ConfirmButton message="Refazer o cronograma a partir de amanhã com as suas horas atuais? Tarefas feitas, revisões, simulados e as que você criou à mão continuam." className="btn-outline btn-sm">↻ Refazer cronograma</ConfirmButton></form>
              </div>
            </div>
            <p className="px-5 pb-3 text-xs text-muted">O cronograma usa <b>as suas horas de cada dia</b> (blocos de {plan.blockMinutes} min) e o ciclo de estudos pelo peso das matérias, com <b>o tema de cada assunto</b> em cada bloco. Não repete tema e não mexe nos dias que já têm tarefas. Mudou as horas? Use <b>Refazer cronograma</b>. Simulado a cada {plan.simuladoEvery || "—"} dias; revisões {plan.reviewDays.split(",").join(", ")} dias depois de estudar cada tema.</p>
            <ul className="divide-y divide-line">
              {upcoming.map(({ d, items }) => (
                <li key={dayKey(d)}>
                  <details className="group px-5 py-3" open={false}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                      <span className="font-bold capitalize text-navy">{d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" })}</span>
                      <span className="flex flex-wrap justify-end gap-1">{items.length === 0 ? <span className="text-xs text-muted">{studyDays.includes(d.getUTCDay()) ? "livre" : "descanso"}</span> : Object.entries(items.reduce<Record<string, number>>((a, t) => ({ ...a, [t.kind]: (a[t.kind] ?? 0) + 1 }), {})).map(([k, n]) => <span key={k} className={`badge ${KIND_STYLE[k]}`}>{n} {KIND_LABEL[k as keyof typeof KIND_LABEL].toLowerCase()}</span>)}</span>
                    </summary>
                    {items.length > 0 && <ul className="-mx-5 mt-2 divide-y divide-line border-t border-line">{items.map((t) => <TaskRow key={t.id} t={t} />)}</ul>}
                  </details>
                </li>
              ))}
            </ul>
          </section>

          {/* GRÁFICOS */}
          <section className="card space-y-6">
            <div><p className="text-lg font-bold text-navy">Horas estudadas · 14 dias</p><p className="mb-2 text-sm text-muted">Passe o dedo nas colunas para ver o tempo de cada dia</p><HoursChart days={hours} goal={plan.dailyMinutes} /></div>
            <div><p className="text-lg font-bold text-navy">Simulados · % de acertos</p><p className="mb-2 text-sm text-muted">Na prova é preciso 50% do total e 40% em cada matéria</p><SimuladosChart points={simPts} />
              {simulados.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer font-bold text-navy">Ver em tabela</summary><table className="mt-2 w-full text-right"><thead className="text-xs uppercase text-muted"><tr><th className="text-left">Data</th><th>Acertos</th><th>%</th></tr></thead><tbody>{simulados.map((s) => <tr key={s.id} className="border-t border-line"><td className="py-1 text-left">{fmtDate(s.date)}</td><td>{s.correct ?? 0}/{s.questions}</td><td>{Math.round(((s.correct ?? 0) / (s.questions || 1)) * 100)}%</td></tr>)}</tbody></table></details>}
            </div>
          </section>

          {/* EDITAL */}
          <section className="card p-0">
            <div className="px-5 py-4"><p className="text-lg font-bold text-navy">Progresso do edital</p><p className="text-sm text-muted">{seenTopics} de {totalTopics} temas estudados. Toque na matéria para marcar temas, mudar o peso ou <b className="text-ink">colar os temas do seu edital</b> (um por linha): eles entram no cronograma automático na ordem da lista.</p></div>
            <ul className="divide-y divide-line">{subjects.map((s) => {
              const seen = s.topics.filter((t) => t.studiedAt).length, pct = s.topics.length ? Math.round((seen / s.topics.length) * 100) : 0, a = accBy(s.id);
              return (
                <li key={s.id}>
                  <details className="px-5 py-3">
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-baseline justify-between gap-2"><b className="text-navy">{s.name} <span className="text-xs font-normal text-muted">peso {s.weight}</span></b><span className="shrink-0 text-sm text-muted"><b className="text-ink">{seen}/{s.topics.length}</b>{a != null && <> · <span className={a < 40 ? "font-bold text-red-700" : ""}>{a}% acerto</span></>}</span></div>
                      <div className="viz mt-2 h-2 overflow-hidden rounded-full bg-light"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "var(--s3)" : "var(--s1)" }} /></div>
                    </summary>
                    <div className="mt-3 space-y-2 rounded-xl bg-light p-3">
                      <ul className="space-y-1">{s.topics.map((t) => (
                        <li key={t.id} className="relative flex items-center justify-between gap-2 text-sm">
                          <form action={toggleTopic} className="flex-1"><input type="hidden" name="id" value={t.id} /><button className="flex w-full items-center gap-2 text-left"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${t.studiedAt ? "border-green-600 bg-green-600 text-white" : "border-line"}`}>{t.studiedAt ? "✓" : ""}</span><span className={t.studiedAt ? "text-muted line-through" : "text-ink"}>{t.name}</span></button></form>
                          <a href={videoLink(t.name, s.name, t.videoUrl)} target="_blank" rel="noopener" title={t.videoUrl ? "Aula escolhida" : "Buscar aula no YouTube"} className={`shrink-0 text-xs font-bold ${t.videoUrl ? "text-red-700" : "text-muted hover:text-red-700"}`}>▶</a>
                          <details className="shrink-0"><summary className="cursor-pointer list-none text-xs text-muted hover:text-navy" title="Colar link do vídeo">🔗</summary>
                            <form action={setTopicVideo} className="absolute right-4 z-10 mt-1 flex w-72 gap-1 rounded-xl border border-line bg-white p-2 shadow-lg"><input type="hidden" name="id" value={t.id} /><input name="url" defaultValue={t.videoUrl ?? ""} placeholder="Link do YouTube (vazio = buscar)" className="input py-1.5 text-xs" /><button className="btn-navy btn-sm">OK</button></form></details>
                          <form action={deleteTopic}><input type="hidden" name="id" value={t.id} /><ConfirmButton message={`Remover o assunto "${t.name}"?`} className="text-xs text-muted hover:text-red-700">✕</ConfirmButton></form>
                        </li>))}</ul>
                      <TopicForm subjectId={s.id} />
                      <SubjectForm sub={{ id: s.id, name: s.name, weight: s.weight }} />
                      <form action={deleteSubject} className="text-right"><input type="hidden" name="id" value={s.id} /><ConfirmButton message={`Remover a matéria "${s.name}" e as tarefas dela?`} className="text-xs font-bold text-red-700 hover:underline">Remover matéria</ConfirmButton></form>
                    </div>
                  </details>
                </li>);
            })}</ul>
            <div className="border-t border-line p-5">
              <details><summary className="cursor-pointer font-bold text-navy">📄 Importar conteúdo do edital</summary>
                <p className="my-2 text-sm text-muted">Copie o <b className="text-ink">Anexo IV – Conteúdo Programático</b> do edital da PMPB (PDF ou PS Mentoria) e cole aqui. O sistema separa os temas de cada matéria e refaz o cronograma.</p>
                <EditalImportForm /></details>
            </div>
            <div className="border-t border-line p-5"><p className="mb-2 font-bold text-navy">Nova matéria</p><SubjectForm /></div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
          <section className="card"><p className="mb-3 text-lg font-bold text-navy">Adicionar tarefa</p><AddTaskForm subjects={subjOpts} today={tk} /></section>
          <section id="plano" className="card scroll-mt-20">
            <details open={!plan.dayMinutes}><summary className="cursor-pointer text-lg font-bold text-navy">⚙ Plano, horas e metas</summary>
              <div className="mt-3"><PlanForm p={{ title: plan.title, examDate: plan.examDate ? dayKey(plan.examDate) : "", dayMinutes: dayMin, blockMinutes: plan.blockMinutes, weeklyQuestions: plan.weeklyQuestions, reviewDays: plan.reviewDays.split(",").join(", "), simuladoEvery: plan.simuladoEvery }} /></div>
            </details>
          </section>
          <section className="card space-y-2 text-sm text-muted">
            <p className="font-bold text-navy">Como usar</p>
            <p>1. Em <b className="text-ink">Plano, horas e metas</b>, coloque quantas horas você tem em cada dia e a data da prova.</p>
            <p>2. O cronograma se monta sozinho com o assunto de cada matéria e um link de aula no YouTube. Mudou as horas? <b className="text-ink">↻ Refazer cronograma</b>.</p>
            <p>3. Estudou? <b className="text-ink">✓ Estudei</b> (com questões e acertos). As revisões entram sozinhas.</p>
            <p>4. Não deu? <b className="text-ink">↻ Amanhã</b> ou outra data. Atrasadas aparecem no topo.</p>
            <p>5. A cada {plan.simuladoEvery || 15} dias tem <b className="text-ink">simulado</b>: registre os acertos e acompanhe o gráfico.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
