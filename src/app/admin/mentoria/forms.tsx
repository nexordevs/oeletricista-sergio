"use client";
import { useEffect, useRef, useState } from "react";
import { useStickyAction, StickyForm } from "@/components/form-kit";
import { Submit, FormMessage, Field } from "@/components/ui";
import { savePlan, completeTask, addTask, saveSubject, addTopic, rescheduleTask, addQuestionLog } from "./actions";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function PlanForm({ p }: { p: { title: string; examDate: string; dailyMinutes: number; blockMinutes: number; weeklyQuestions: number; studyDays: number[]; reviewDays: string; simuladoEvery: number } }) {
  const [s, a, pending] = useStickyAction(savePlan);
  return (
    <StickyForm pending={pending} onSubmit={a} className="space-y-3" noValidate>
      <FormMessage state={s} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Concurso" name="title" state={s}><input id="title" name="title" defaultValue={p.title} className="input" /></Field>
        <Field label="Data da prova" name="examDate" state={s} hint="Deixe vazio se ainda não saiu o edital."><input id="examDate" name="examDate" type="date" defaultValue={p.examDate} className="input" /></Field>
        <Field label="Meta de estudo por dia (min)" name="dailyMinutes" state={s}><input id="dailyMinutes" name="dailyMinutes" inputMode="numeric" defaultValue={p.dailyMinutes} className="input" /></Field>
        <Field label="Duração de cada bloco (min)" name="blockMinutes" state={s}><input id="blockMinutes" name="blockMinutes" inputMode="numeric" defaultValue={p.blockMinutes} className="input" /></Field>
        <Field label="Meta de questões por semana" name="weeklyQuestions" state={s}><input id="weeklyQuestions" name="weeklyQuestions" inputMode="numeric" defaultValue={p.weeklyQuestions} className="input" /></Field>
        <Field label="Simulado a cada (dias)" name="simuladoEvery" state={s} hint="0 = sem simulados automáticos"><input id="simuladoEvery" name="simuladoEvery" inputMode="numeric" defaultValue={p.simuladoEvery} className="input" /></Field>
        <Field label="Revisões depois de estudar (dias)" name="reviewDays" state={s} hint="Ex.: 1, 7, 15 → revisa 1 dia, 7 dias e 15 dias depois"><input id="reviewDays" name="reviewDays" defaultValue={p.reviewDays} className="input" /></Field>
        <div><span className="label">Dias de estudo</span>
          <div className="flex flex-wrap gap-1.5">{DAYS.map((d, i) => (
            <label key={d} className="cursor-pointer rounded-lg border-2 border-line px-2.5 py-1.5 text-sm font-bold has-[:checked]:border-navy has-[:checked]:bg-navy has-[:checked]:text-white">
              <input type="checkbox" name="studyDays" value={i} defaultChecked={p.studyDays.includes(i)} className="sr-only" />{d}</label>))}</div>
          {s?.fields?.studyDays && <p className="mt-1 text-sm font-bold text-red-700">{s.fields.studyDays}</p>}
        </div>
      </div>
      <Submit className="btn-navy">Salvar plano</Submit>
    </StickyForm>
  );
}

/** Concluir tarefa: questões/acertos opcionais (no simulado, já vem 80). */
export function DoneForm({ id, simulado }: { id: string; simulado?: boolean }) {
  const [s, a, pending] = useStickyAction(completeTask);
  const [open, setOpen] = useState(Boolean(simulado));
  return (
    <StickyForm pending={pending} onSubmit={a} className="space-y-1" noValidate>
      <input type="hidden" name="id" value={id} />
      {open && (
        <div className="flex items-center gap-1.5 text-sm">
          <input name="questions" inputMode="numeric" aria-label="Questões feitas" defaultValue={simulado ? "80" : ""} placeholder="questões" className="input w-24 py-1.5 text-center text-sm" />
          <input name="correct" inputMode="numeric" aria-label="Acertos" placeholder="acertos" className="input w-24 py-1.5 text-center text-sm" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Submit className="btn-primary btn-sm" pending="...">✓ Estudei</Submit>
        {!open && <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-muted underline">+ questões</button>}
      </div>
      {s?.error && <p className="text-xs font-bold text-red-700">{s.error}</p>}
    </StickyForm>
  );
}

/** Não estudou: amanhã, hoje ou escolher data. */
export function RescheduleForm({ id, overdue }: { id: string; overdue?: boolean }) {
  const [pick, setPick] = useState(false);
  return (
    <form action={rescheduleTask} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      {overdue && <button name="to" value="hoje" className="btn-outline btn-sm">Para hoje</button>}
      <button name="to" value="amanha" className="btn-outline btn-sm">↻ Amanhã</button>
      {pick ? <><input type="date" name="to" aria-label="Nova data" className="input w-auto py-1.5 text-sm" required /><button className="btn-navy btn-sm">OK</button></>
        : <button type="button" onClick={() => setPick(true)} className="text-xs font-bold text-muted underline">outra data</button>}
    </form>
  );
}

export function AddTaskForm({ subjects, today }: { subjects: { id: string; name: string }[]; today: string }) {
  const [s, a, pending] = useStickyAction(addTask);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok) ref.current?.reset(); }, [s]);
  return (
    <StickyForm ref={ref} pending={pending} onSubmit={a} className="space-y-2" noValidate>
      <FormMessage state={s} />
      <Field label="O que estudar" name="title" state={s}><input id="title-t" name="title" className="input" placeholder="Ex.: Lei 3.909 – leitura do estatuto" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <select name="kind" aria-label="Tipo" className="input py-2 text-sm" defaultValue="TEORIA"><option value="TEORIA">Teoria</option><option value="QUESTOES">Questões</option><option value="REVISAO">Revisão</option><option value="SIMULADO">Simulado</option></select>
        <select name="subjectId" aria-label="Matéria" className="input py-2 text-sm" defaultValue=""><option value="">Sem matéria</option>{subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <input name="date" type="date" defaultValue={today} aria-label="Data" className="input py-2 text-sm" />
        <input name="minutes" inputMode="numeric" defaultValue="60" aria-label="Minutos" className="input py-2 text-sm" />
      </div>
      <Submit className="btn-navy btn-sm w-full">Adicionar</Submit>
    </StickyForm>
  );
}

export function SubjectForm({ sub }: { sub?: { id: string; name: string; weight: number } }) {
  const [s, a, pending] = useStickyAction(saveSubject);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok && !sub) ref.current?.reset(); }, [s, sub]);
  return (
    <StickyForm ref={ref} pending={pending} onSubmit={a} className="flex items-end gap-2" noValidate>
      {sub && <input type="hidden" name="id" value={sub.id} />}
      <div className="flex-1"><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`sn${sub?.id ?? "n"}`}>Matéria</label><input id={`sn${sub?.id ?? "n"}`} name="name" defaultValue={sub?.name} className="input py-2" placeholder="Nova matéria" /></div>
      <div className="w-20"><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`sw${sub?.id ?? "n"}`}>Peso</label><input id={`sw${sub?.id ?? "n"}`} name="weight" inputMode="numeric" defaultValue={sub?.weight ?? 5} className="input py-2 text-center" /></div>
      <Submit className="btn-navy btn-sm" pending="...">{sub ? "Salvar" : "Criar"}</Submit>
      {s?.error && <p className="text-xs font-bold text-red-700">{Object.values(s.fields || {})[0] || s.error}</p>}
    </StickyForm>
  );
}

export function TopicForm({ subjectId }: { subjectId: string }) {
  const [s, a, pending] = useStickyAction(addTopic);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok) ref.current?.reset(); }, [s]);
  return (
    <StickyForm ref={ref} pending={pending} onSubmit={a} className="flex gap-2" noValidate>
      <input type="hidden" name="subjectId" value={subjectId} />
      <input name="name" aria-label="Novo assunto" placeholder="Novo assunto do edital" className="input flex-1 py-2 text-sm" />
      <Submit className="btn-outline btn-sm" pending="...">+ Assunto</Submit>
    </StickyForm>
  );
}

/** Lançar questões resolvidas. Lembra a última matéria e fonte usadas neste aparelho. */
export function QuestionLogForm({ subjects, today }: { subjects: { id: string; name: string; topics: { id: string; name: string }[] }[]; today: string }) {
  const [s, a, pending] = useStickyAction(addQuestionLog);
  const [sub, setSub] = useState(""); const [src, setSrc] = useState("");
  const [q, setQ] = useState(""); const [c, setC] = useState("");
  useEffect(() => { try { setSub(localStorage.getItem("mq-sub") || ""); setSrc(localStorage.getItem("mq-src") || ""); } catch { /* sem storage */ } }, []);
  useEffect(() => { if (s?.ok) { setQ(""); setC(""); try { localStorage.setItem("mq-sub", sub); localStorage.setItem("mq-src", src); } catch { /* sem storage */ } } }, [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const topics = subjects.find((x) => x.id === sub)?.topics ?? [];
  const nq = Number(q), nc = Number(c);
  const pct = nq > 0 && nc >= 0 && nc <= nq ? Math.round((nc / nq) * 100) : null;
  return (
    <StickyForm pending={pending} onSubmit={a} className="space-y-3" noValidate>
      <FormMessage state={s} />
      <Field label="Matéria" name="subjectId" state={s}>
        <select id="subjectId" name="subjectId" className="input" value={sub} onChange={(e) => setSub(e.target.value)}><option value="" disabled>Escolha…</option>{subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </Field>
      {topics.length > 0 && (
        <Field label="Assunto (opcional)" name="topicId" state={s}>
          <select id="topicId" name="topicId" className="input" defaultValue=""><option value="">Vários / não sei</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Questões feitas" name="questions" state={s}><input id="questions" name="questions" inputMode="numeric" value={q} onChange={(e) => setQ(e.target.value)} className="input text-center text-lg font-bold" placeholder="20" /></Field>
        <Field label="Acertos" name="correct" state={s}><input id="correct" name="correct" inputMode="numeric" value={c} onChange={(e) => setC(e.target.value)} className="input text-center text-lg font-bold" placeholder="15" /></Field>
      </div>
      {pct != null && <p className={`rounded-xl px-3 py-2 text-center text-sm font-bold ${pct >= 70 ? "bg-green-50 text-green-800" : pct >= 50 ? "bg-light text-navy" : "bg-red-50 text-red-800"}`}>{pct}% de acerto {pct >= 70 ? "· mandou bem!" : pct >= 50 ? "· na média da prova" : pct >= 40 ? "· no limite (40% por matéria)" : "· abaixo do mínimo, revise"}</p>}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2"><label className="label" htmlFor="source">Fonte</label><input id="source" name="source" list="fontes" value={src} onChange={(e) => setSrc(e.target.value)} className="input" placeholder="QConcursos, TEC…" />
          <datalist id="fontes">{["QConcursos", "TEC Concursos", "Gran Questões", "Estratégia", "PDF / apostila", "Prova anterior IBFC"].map((f) => <option key={f} value={f} />)}</datalist></div>
        <div><label className="label" htmlFor="minutes">Tempo (min)</label><input id="minutes" name="minutes" inputMode="numeric" className="input text-center" placeholder="40" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor="qdate">Data</label><input id="qdate" name="date" type="date" defaultValue={today} className="input" /></div>
        <div><label className="label" htmlFor="note">Obs. (opcional)</label><input id="note" name="note" className="input" placeholder="errei crase" /></div>
      </div>
      <Submit className="btn-primary w-full">Lançar questões</Submit>
    </StickyForm>
  );
}
