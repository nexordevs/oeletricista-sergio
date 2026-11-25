// Gráficos da mentoria (SVG no servidor, cores por papel em .viz — validadas nos dois temas).
const W = 400; // largura pensada para o celular (texto legível); no computador o gráfico cresce até 640px

/** Minutos estudados por dia (uma série) com a linha da meta diária. */
export function HoursChart({ days, goal }: { days: { label: string; minutes: number; today: boolean }[]; goal: number }) {
  const H = 210, L = 34, B = 24, T = 14, R = 4, plotW = W - L - R, plotH = H - T - B;
  const max = Math.max(goal, ...days.map((d) => d.minutes), 60);
  const top = Math.ceil(max / 60) * 60;
  const y = (v: number) => T + plotH - (v / top) * plotH;
  const gw = plotW / days.length, bw = Math.min(18, gw - 5);
  const ticks = Array.from({ length: top / 60 + 1 }, (_, i) => i * 60).filter((_, i, a) => a.length <= 6 || i % 2 === 0);
  return (
    <div className="viz">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[640px]" role="img" aria-label="Horas estudadas por dia nas últimas duas semanas">
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--grid)" /><text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={13} fill="var(--axis)">{t / 60}h</text></g>)}
        {days.map((d, i) => {
          const h = d.minutes > 0 ? Math.max(2, plotH - (y(d.minutes) - T)) : 0, x = L + i * gw + (gw - bw) / 2;
          return (
            <g key={i} className="viz-group">
              <rect x={L + i * gw} y={T} width={gw} height={plotH} fill="transparent"><title>{`${d.label}: ${Math.floor(d.minutes / 60)}h${String(d.minutes % 60).padStart(2, "0")} estudadas`}</title></rect>
              {h > 0 && <path pointerEvents="none" className="viz-mark" fill={d.minutes >= goal ? "var(--s3)" : "var(--s1)"} d={`M${x},${T + plotH} V${T + plotH - h + 4} Q${x},${T + plotH - h} ${x + 4},${T + plotH - h} H${x + bw - 4} Q${x + bw},${T + plotH - h} ${x + bw},${T + plotH - h + 4} V${T + plotH} Z`} />}
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="var(--axis)" fontWeight={d.today ? 700 : 400}>{d.today ? "hoje" : d.label}</text>
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} stroke="var(--s2)" strokeWidth={2} strokeDasharray="6 5" />
        <text x={W - R} y={y(goal) - 5} textAnchor="end" fontSize={13} fontWeight={700} fill="var(--axis)">meta {Math.floor(goal / 60)}h{goal % 60 ? String(goal % 60).padStart(2, "0") : ""}</text>
        <line x1={L} x2={W - R} y1={T + plotH} y2={T + plotH} stroke="var(--axis)" />
      </svg>
      <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: "var(--s1)" }} />abaixo da meta</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: "var(--s3)" }} />bateu a meta</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: "var(--s2)" }} />meta diária</span>
      </div>
    </div>
  );
}

/** Evolução dos simulados (% de acertos) com a linha de 50% (mínimo para aprovação). */
export function SimuladosChart({ points }: { points: { label: string; pct: number; detail: string }[] }) {
  if (points.length === 0) return <p className="text-sm text-muted">Faça o primeiro simulado e registre os acertos para ver sua evolução aqui.</p>;
  const H = 210, L = 38, B = 24, T = 18, R = 14, plotW = W - L - R, plotH = H - T - B;
  const y = (v: number) => T + plotH - (v / 100) * plotH;
  const x = (i: number) => (points.length === 1 ? L + plotW / 2 : L + (i / (points.length - 1)) * plotW);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.pct)}`).join(" ");
  return (
    <div className="viz">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[640px]" role="img" aria-label="Porcentagem de acertos nos simulados">
        {[0, 25, 50, 75, 100].map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--grid)" /><text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={13} fill="var(--axis)">{t}%</text></g>)}
        <line x1={L} x2={W - R} y1={y(50)} y2={y(50)} stroke="var(--s2)" strokeWidth={2} strokeDasharray="6 5" />
        <text x={W - R} y={y(50) - 5} textAnchor="end" fontSize={13} fontWeight={700} fill="var(--axis)">mínimo 50%</text>
        <path d={path} fill="none" stroke="var(--s1)" strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.pct)} r={14} fill="transparent"><title>{`${p.label}: ${p.pct}% (${p.detail})`}</title></circle>
            <circle pointerEvents="none" cx={x(i)} cy={y(p.pct)} r={5} fill="var(--s1)" stroke="var(--surface, #fff)" strokeWidth={2} />
            {(i === points.length - 1 || points.length <= 6) && <text x={x(i)} y={y(p.pct) - 10} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--axis)">{p.pct}%</text>}
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={12} fill="var(--axis)">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Questões por dia (14 dias): colunas empilhadas acertos × erros, com espaço de 2px entre os blocos. */
export function QuestionsChart({ days }: { days: { label: string; correct: number; wrong: number; today: boolean }[] }) {
  const H = 210, L = 34, B = 24, T = 14, R = 4, plotW = W - L - R, plotH = H - T - B;
  const max = Math.max(10, ...days.map((d) => d.correct + d.wrong));
  const step = [5, 10, 20, 25, 50, 100, 200].find((s) => max / s <= 4) ?? 500, top = Math.ceil(max / step) * step;
  const y = (v: number) => T + plotH - (v / top) * plotH;
  const gw = plotW / days.length, bw = Math.min(18, gw - 5);
  if (days.every((d) => !d.correct && !d.wrong)) return <p className="text-sm text-muted">Lance as questões que você resolver para ver o gráfico.</p>;
  return (
    <div className="viz">
      <div className="mb-2 flex flex-wrap gap-4 text-sm"><span className="flex items-center gap-1.5 text-ink"><span className="h-3 w-3 rounded-sm" style={{ background: "var(--s3)" }} />Acertos</span><span className="flex items-center gap-1.5 text-ink"><span className="h-3 w-3 rounded-sm" style={{ background: "var(--s2)" }} />Erros</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[640px]" role="img" aria-label="Questões resolvidas por dia, acertos e erros">
        {Array.from({ length: top / step + 1 }, (_, i) => i * step).map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--grid)" /><text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--axis)">{t}</text></g>)}
        {days.map((d, i) => {
          const x = L + i * gw + (gw - bw) / 2, hc = plotH - (y(d.correct) - T), hw = plotH - (y(d.wrong) - T);
          const gap = d.correct > 0 && d.wrong > 0 ? 2 : 0;
          return (
            <g key={i} className="viz-group">
              <rect x={L + i * gw} y={T} width={gw} height={plotH} fill="transparent"><title>{`${d.today ? "Hoje" : d.label}: ${d.correct + d.wrong} questões · ${d.correct} acertos · ${d.wrong} erros${d.correct + d.wrong ? ` (${Math.round((d.correct / (d.correct + d.wrong)) * 100)}%)` : ""}`}</title></rect>
              {hc > 0 && <rect pointerEvents="none" className="viz-mark" x={x} y={T + plotH - hc} width={bw} height={hc} fill="var(--s3)" />}
              {hw > 0 && <rect pointerEvents="none" className="viz-mark" x={x} y={T + plotH - hc - gap - hw} width={bw} height={hw} rx={3} fill="var(--s2)" />}
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="var(--axis)" fontWeight={d.today ? 700 : 400}>{d.today ? "hoje" : d.label}</text>
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={T + plotH} y2={T + plotH} stroke="var(--axis)" />
      </svg>
    </div>
  );
}
