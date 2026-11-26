"use client";
import { useMemo, useState } from "react";
import { dimensionar, METODOS, PRESETS, type Entrada, type Metodo, type Sistema, type TipoCircuito } from "@/lib/eletrica/dimensionamento";
import { BuscaAparelho } from "./BuscaAparelho";

const num = (s: string) => { const n = Number(s.replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const fmt = (n: number | null, d = 1) => (n == null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: d }));
const TIPOS: Record<TipoCircuito, string> = { iluminacao: "Iluminação", tomadas: "Tomadas de uso geral", dedicado: "Uso específico (chuveiro, ar, forno…)", motor: "Motor" };
const SIST: Record<Sistema, string> = { mono: "Monofásico (F + N)", bi: "Bifásico (F + F)", tri: "Trifásico (3F)" };

export function Calculadora() {
  const [f, setF] = useState({ potencia: "7500", tensao: "220", sistema: "mono" as Sistema, fp: "1", comprimento: "15", metodo: "B1" as Metodo, temperatura: "30", agrupados: "1", queda: "4", tipo: "dedicado" as TipoCircuito, molhada: true });
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const entrada: Entrada = { potenciaW: num(f.potencia), tensao: num(f.tensao), sistema: f.sistema, fp: num(f.fp) || 1, comprimentoM: num(f.comprimento), metodo: f.metodo, temperatura: num(f.temperatura), circuitosAgrupados: num(f.agrupados) || 1, quedaMax: num(f.queda) || 4, tipo: f.tipo, areaMolhada: f.molhada };
  const ok = entrada.potenciaW > 0 && entrada.tensao > 0 && entrada.comprimentoM > 0;
  const r = useMemo(() => (ok ? dimensionar(entrada) : null), [JSON.stringify(entrada), ok]); // eslint-disable-line react-hooks/exhaustive-deps
  const preset = (i: string) => {
    const p = PRESETS[Number(i)];
    if (p) setF((x) => ({ ...x, potencia: String(p.w), fp: String(p.fp), tipo: p.tipo, molhada: Boolean(p.molhada),
      sistema: p.sistema ?? (x.sistema === "tri" ? "mono" : x.sistema), tensao: p.tensao ? String(p.tensao) : x.tensao === "380" ? "220" : x.tensao }));
  };
  const grupos = [...new Set(PRESETS.map((p) => p.grupo))];
  const L = "label", I = "input";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <section className="card space-y-4">
        <div><label className={L} htmlFor="preset">Aparelho comum (preenche os campos)</label>
          <div className="mb-2"><BuscaAparelho onPick={(i) => preset(String(i))} /></div>
          <select id="preset" className={I} defaultValue="" onChange={(e) => preset(e.target.value)}><option value="">Ou escolha pela lista…</option>{grupos.map((g) => <optgroup key={g} label={g}>{PRESETS.map((p, i) => (p.grupo === g ? <option key={p.nome} value={i}>{p.nome}</option> : null))}</optgroup>)}</select>
          <p className="mt-1 text-xs text-muted">{PRESETS.length} aparelhos de casa e apartamento com potências típicas. Use sempre a da placa do equipamento ou do projeto.</p></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={L} htmlFor="pot">Potência (W)</label><input id="pot" className={I} inputMode="decimal" value={f.potencia} onChange={(e) => set("potencia", e.target.value)} /></div>
          <div><label className={L} htmlFor="ten">Tensão (V)</label><select id="ten" className={I} value={f.tensao} onChange={(e) => set("tensao", e.target.value)}>{["127", "220", "380"].map((v) => <option key={v}>{v}</option>)}</select></div>
          <div><label className={L} htmlFor="fp">Fator de potência</label><input id="fp" className={I} inputMode="decimal" value={f.fp} onChange={(e) => set("fp", e.target.value)} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={L} htmlFor="sis">Sistema</label><select id="sis" className={I} value={f.sistema} onChange={(e) => set("sistema", e.target.value)}>{Object.entries(SIST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className={L} htmlFor="tipo">Tipo de circuito</label><select id="tipo" className={I} value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div><label className={L} htmlFor="met">Forma de instalação</label><select id="met" className={I} value={f.metodo} onChange={(e) => set("metodo", e.target.value)}>{Object.entries(METODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className={L} htmlFor="comp">Distância (m)</label><input id="comp" className={I} inputMode="decimal" value={f.comprimento} onChange={(e) => set("comprimento", e.target.value)} /></div>
          <div><label className={L} htmlFor="agr">Circuitos no eletroduto</label><select id="agr" className={I} value={f.agrupados} onChange={(e) => set("agrupados", e.target.value)}>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n}>{n}</option>)}</select></div>
          <div><label className={L} htmlFor="tmp">Temperatura (°C)</label><select id="tmp" className={I} value={f.temperatura} onChange={(e) => set("temperatura", e.target.value)}>{[25, 30, 35, 40, 45, 50].map((n) => <option key={n}>{n}</option>)}</select></div>
          <div><label className={L} htmlFor="qd">Queda máx. (%)</label><select id="qd" className={I} value={f.queda} onChange={(e) => set("queda", e.target.value)}>{[2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></div>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-navy"><input type="checkbox" checked={f.molhada} onChange={(e) => set("molhada", e.target.checked)} className="h-5 w-5 accent-navy" /> Área molhada (banheiro, cozinha, lavanderia, área externa)</label>
      </section>

      <aside className="space-y-3 lg:sticky lg:top-6 lg:h-fit">
        {!r ? <div className="card text-muted">Preencha potência, tensão e distância.</div> : (<>
          <div className="rounded-2xl bg-navy p-5 text-white">
            <p className="text-xs font-bold uppercase text-navy-soft">Corrente de projeto</p>
            <p className="text-4xl font-bold">{fmt(r.ib)} A</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3"><p className="text-xs font-bold uppercase text-navy-soft">Disjuntor</p><p className="text-2xl font-bold text-brand">{r.disjuntor ? `${r.disjuntor} A` : "—"}</p><p className="text-xs text-navy-soft">curva {r.curva}</p></div>
              <div className="rounded-xl bg-white/10 p-3"><p className="text-xs font-bold uppercase text-navy-soft">Fio (fase)</p><p className="text-2xl font-bold text-brand">{r.secao ? `${fmt(r.secao)} mm²` : "—"}</p><p className="text-xs text-navy-soft">{r.motivoSecao && `por ${r.motivoSecao}`}</p></div>
            </div>
          </div>
          <div className="card space-y-2 text-sm">
            <p className="flex justify-between"><span className="text-muted">Neutro</span><b>{r.neutro ? `${fmt(r.neutro)} mm²` : "—"}{f.sistema === "bi" ? " (se houver)" : ""}</b></p>
            <p className="flex justify-between"><span className="text-muted">Terra (proteção)</span><b>{r.terra ? `${fmt(r.terra)} mm²` : "—"}</b></p>
            <p className="flex justify-between"><span className="text-muted">Capacidade do fio corrigida</span><b>{r.iz ? `${fmt(r.iz)} A` : "—"}</b></p>
            <p className="flex justify-between"><span className="text-muted">Queda de tensão</span><b className={r.quedaPct != null && r.quedaPct > num(f.queda) ? "text-red-700" : ""}>{r.quedaPct != null ? `${fmt(r.quedaV, 2)} V (${fmt(r.quedaPct, 2)}%)` : "—"}</b></p>
            <p className="flex justify-between"><span className="text-muted">Fatores (temp. × agrup.)</span><b>{r.fatorTemp} × {r.fatorAgrup}</b></p>
            <p className="flex justify-between"><span className="text-muted">Seção mínima (norma)</span><b>{fmt(r.minimoNorma)} mm²</b></p>
            <p className={`rounded-lg px-3 py-2 font-bold ${r.dr === "obrigatorio" ? "bg-red-50 text-red-800" : "bg-light text-navy"}`}>DR 30 mA: {r.dr === "obrigatorio" ? "obrigatório (área molhada)" : "recomendado"}</p>
          </div>
          {r.avisos.length > 0 && <ul className="card space-y-1 border-amber-200 bg-amber-50 text-sm text-amber-900">{r.avisos.map((a) => <li key={a}>⚠ {a}</li>)}</ul>}
          <p className="text-xs text-muted">Cálculo de referência pela NBR 5410 (cobre, isolação PVC 70 °C, Tabela 36; fatores das Tabelas 40 e 42; terra pela Tabela 58). Confira as condições reais da instalação e a norma; a responsabilidade técnica é do profissional.</p>
        </>)}
      </aside>
    </div>
  );
}
