// Gráficos do controle de gastos (SVG no servidor; cores por papel em .viz, com versão escura).
import { brl } from "@/lib/money";

const SLOTS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : n.toLocaleString("pt-BR", { maximumFractionDigits: 0 }));

/** Para onde foi o dinheiro: barra segmentada alta (até 5 categorias + Outros), legenda com valores. */
export function SegmentedSpend({ parts }: { parts: { name: string; value: number }[] }) {
  const sorted = parts.filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((a, p) => a + p.value, 0);
  const data = rest > 0 ? [...top, { name: "Outros", value: rest }] : top;
  const total = data.reduce((a, p) => a + p.value, 0);
  if (total <= 0) return <p className="text-sm text-muted">Lance os gastos do mês para ver para onde vai o dinheiro.</p>;
  const W = 600, H = 56, GAP = 2;
  let x = 0;
  const blocks = data.map((p, i) => {
    const w = (p.value / total) * (W - GAP * (data.length - 1));
    const b = { ...p, x, w, color: SLOTS[i], pct: Math.round((p.value / total) * 100) };
    x += w + GAP;
    return b;
  });
  return (
    <div className="viz">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" role="img" aria-label={`Gastos do mês por categoria: ${blocks.map((b) => `${b.name} ${b.pct}%`).join(", ")}`} preserveAspectRatio="none">
        {blocks.map((b) => (
          <g key={b.name} className="viz-mark">
            <rect x={b.x} y={0} width={Math.max(1, b.w)} height={H} rx={4} fill={b.color}><title>{`${b.name}: ${brl(b.value)} (${b.pct}%)`}</title></rect>
          </g>
        ))}
      </svg>
      <ul className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        {blocks.map((b) => (
          <li key={b.name} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: b.color }} /><span className="truncate text-ink">{b.name}</span></span>
            <span className="shrink-0 text-muted"><b className="text-ink">{brl(b.value)}</b> · {b.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Últimos meses: colunas agrupadas Entrou × Gastou × Guardou (um eixo, legenda, dica ao passar o dedo, tabela). */
export function MonthsChart({ months }: { months: { label: string; entrou: number; gastou: number; guardou: number }[] }) {
  const series = [{ key: "entrou", name: "Entrou", color: "var(--s1)" }, { key: "gastou", name: "Gastou", color: "var(--s2)" }, { key: "guardou", name: "Guardou", color: "var(--s3)" }] as const;
  const max = Math.max(1, ...months.flatMap((m) => [m.entrou, m.gastou, m.guardou]));
  const step = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000].find((s) => max / s <= 4) ?? 100000;
  const top = Math.ceil(max / step) * step;
  const W = 400, H = 230, L = 50, B = 24, T = 10, R = 4; // largura pensada para o celular
  const plotW = W - L - R, plotH = H - T - B;
  const gw = plotW / months.length, bw = Math.min(16, (gw - 10) / 3);
  const y = (v: number) => T + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  if (months.every((m) => !m.entrou && !m.gastou && !m.guardou)) return <p className="text-sm text-muted">Ainda não há movimentação nos últimos meses.</p>;
  return (
    <div className="viz">
      <div className="mb-2 flex flex-wrap gap-4 text-sm">{series.map((s) => <span key={s.key} className="flex items-center gap-1.5 text-ink"><span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />{s.name}</span>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[640px]" role="img" aria-label="Entrou, gastou e guardou por mês">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--axis)">{t === 0 ? "0" : `R$ ${k(t)}`}</text>
          </g>
        ))}
        {months.map((m, i) => {
          const gx = L + i * gw + (gw - (bw * 3 + 4)) / 2;
          return (
            <g key={m.label} className="viz-group">
              <rect x={L + i * gw} y={T} width={gw} height={plotH} fill="transparent" className="viz-hit"><title>{`${m.label}\nEntrou: ${brl(m.entrou)}\nGastou: ${brl(m.gastou)}\nGuardou: ${brl(m.guardou)}`}</title></rect>
              {series.map((s, j) => {
                const v = m[s.key];
                const h = Math.max(v > 0 ? 2 : 0, plotH - (y(v) - T));
                return <path key={s.key} className="viz-mark" pointerEvents="none" fill={s.color} d={bar(gx + j * (bw + 2), T + plotH - h, bw, h)} />;
              })}
              <text x={L + i * gw + gw / 2} y={H - 8} textAnchor="middle" fontSize={13} fill="var(--axis)">{m.label}</text>
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={T + plotH} y2={T + plotH} stroke="var(--axis)" strokeWidth={1} />
      </svg>
      <details className="mt-2 text-sm"><summary className="cursor-pointer font-bold text-navy">Ver em tabela</summary>
        <table className="mt-2 w-full text-right"><thead className="text-xs uppercase text-muted"><tr><th className="text-left">Mês</th><th>Entrou</th><th>Gastou</th><th>Guardou</th></tr></thead>
          <tbody>{months.map((m) => <tr key={m.label} className="border-t border-line"><td className="py-1 text-left">{m.label}</td><td>{brl(m.entrou)}</td><td>{brl(m.gastou)}</td><td>{brl(m.guardou)}</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}

// coluna com cantos de 4px só no topo, presa à base
function bar(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}
