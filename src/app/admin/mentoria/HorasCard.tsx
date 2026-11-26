// "Minhas horas de estudo": meta de cada dia da semana × quanto estudou. Usado no início do admin e na Mentoria.
import Link from "next/link";
import { DIAS, fmtHours } from "@/lib/mentoria";
import type { studyHours } from "@/lib/mentoria-server";

const hm = (m: number) => `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, "0")}`;

export function HorasCard({ h, dashboard }: { h: NonNullable<Awaited<ReturnType<typeof studyHours>>>; dashboard?: boolean }) {
  const pct = (v: number, g: number) => (g > 0 ? Math.min(100, Math.round((v / g) * 100)) : 0);
  const weekPct = pct(h.weekMin, h.weekGoal);
  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {dashboard && <p className="text-xs font-bold uppercase tracking-wide text-muted">Estudos · {h.title}</p>}
          <p className="text-lg font-bold text-navy">Minhas horas de estudo</p>
        </div>
        {dashboard
          ? <Link href="/admin/mentoria" className="btn-primary btn-sm">Abrir mentoria</Link>
          : <a href="#plano" className="text-sm font-bold text-navy underline">editar horas</a>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs font-bold uppercase text-muted">Hoje</p><p className="text-xl font-bold text-navy">{hm(h.todayMin)} <span className="text-sm font-normal text-muted">/ {h.todayGoal ? hm(h.todayGoal) : "folga"}</span></p></div>
        <div><p className="text-xs font-bold uppercase text-muted">Semana</p><p className="text-xl font-bold text-navy">{hm(h.weekMin)} <span className="text-sm font-normal text-muted">/ {hm(h.weekGoal)}</span></p></div>
      </div>
      <div className="viz mt-2 h-2.5 overflow-hidden rounded-full bg-light" role="img" aria-label={`${weekPct}% da meta da semana`}><div className="h-full rounded-full" style={{ width: `${weekPct}%`, background: weekPct >= 100 ? "var(--s3)" : "var(--s1)" }} /></div>
      <p className="mt-1 text-xs text-muted">{weekPct}% da meta da semana{h.tasksToday > 0 && <> · hoje: <b className="text-ink">{h.tasksDone}/{h.tasksToday} tarefas feitas</b></>}</p>

      <div className="viz mt-4 grid grid-cols-7 gap-1.5 text-center">
        {h.days.map((d) => {
          const p = pct(d.studied, d.goal), bateu = d.goal > 0 && d.studied >= d.goal;
          return (
            <div key={d.dow} className={`overflow-hidden rounded-xl border ${d.today ? "border-brand ring-2 ring-brand" : "border-line"} ${d.goal > 0 ? "bg-white" : "bg-light"}`} title={`${DIAS[d.dow]}: estudou ${hm(d.studied)}${d.goal ? ` de ${hm(d.goal)}` : " (folga)"}`}>
              <p className="pt-1.5 text-[11px] font-bold uppercase text-muted">{DIAS[d.dow]}</p>
              <p className="text-sm font-bold text-navy">{d.goal > 0 ? fmtHours(d.goal) : "folga"}</p>
              <p className={`pb-1 text-[11px] font-bold ${bateu ? "text-green-700" : d.past && d.goal > 0 ? "text-red-700" : "text-muted"}`}>{d.studied > 0 ? (bateu ? `✓ ${fmtHours(d.studied)}` : fmtHours(d.studied)) : d.past && d.goal > 0 ? "0h" : " "}</p>
              <div className="h-1.5 bg-light"><div className="h-full" style={{ width: `${p}%`, background: bateu ? "var(--s3)" : "var(--s1)" }} /></div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Em cima: sua meta do dia · embaixo: quanto estudou (tarefas feitas + questões lançadas).{!h.hasHours && <b className="text-red-700"> Confira suas horas em “Plano e metas”.</b>}</p>
    </section>
  );
}
