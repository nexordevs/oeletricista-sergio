"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { projetoCompleto, distanciaPorArea, METODOS, ENTRADAS, IMOVEIS, PRESETS, type Carga, type ConfigObra, type Entrada3, type Metodo, type TipoCircuito, type TipoImovel } from "@/lib/eletrica/dimensionamento";
import { IconPlus, IconTrash } from "@/components/icons";
import { BuscaAparelho } from "./BuscaAparelho";

const num = (s: string) => { const n = Number(String(s).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const fmt = (n: number | null | undefined, d = 1) => (n == null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: d }));
const TIPOS: Record<TipoCircuito, string> = { iluminacao: "Iluminação", tomadas: "Tomadas", dedicado: "Uso específico", motor: "Motor" };
type Linha = { id: number; nome: string; potencia: string; quantidade: string; comprimento: string; auto: boolean; tipo: TipoCircuito; molhada: boolean; fp: number; sistema: Carga["sistema"]; tensao: number };
let seq = 0;
const linha = (p: Partial<Linha> = {}): Linha => ({ id: ++seq, nome: "Carga", potencia: "1000", quantidade: "1", comprimento: "15", auto: true, tipo: "tomadas", molhada: false, fp: 1, sistema: "mono", tensao: 220, ...p });
const daPreset = (i: number): Linha => {
  const p = PRESETS[i];
  return linha({ nome: p.nome.replace(/\s*\(~?[\d.,]+\s*(W|VA)\)\s*$/, ""), potencia: String(p.w), tipo: p.tipo, molhada: Boolean(p.molhada), fp: p.fp, sistema: p.sistema ?? "mono", tensao: p.tensao ?? 220 });
};
const byName = (n: string) => PRESETS.findIndex((p) => p.nome.startsWith(n));
const APTO = [["Chuveiro 7.500 W", 2], ["Split inverter 9.000 BTU", 2], ["Split inverter 12.000 BTU", 1], ["Tomadas da cozinha", 1], ["Tomadas da área de serviço", 1], ["Tomadas de sala/quartos", 2], ["Tomadas do banheiro", 1], ["Iluminação de apartamento 3 quartos", 1], ["Micro-ondas", 1], ["Air fryer", 1]] as const;
const CASA = [["Chuveiro 7.500 W", 1], ["Ar 12.000 BTU", 2], ["Tomadas da cozinha", 1], ["Tomadas da área de serviço", 1], ["Tomadas de sala/quartos", 2], ["Tomadas do banheiro", 1], ["Iluminação interna", 2], ["Micro-ondas", 1]] as const;

export function Multipla() {
  const router = useRouter();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [cfg, setCfg] = useState({ area: "", imovel: "terrea" as TipoImovel, entrada: "mono" as Entrada3, metodo: "B1" as Metodo, temperatura: "30", quedaMax: "4", agrupados: "2", distanciaEntradaM: "10" });
  const dist = (tipo: TipoCircuito, area = cfg.area, imovel = cfg.imovel) => String(distanciaPorArea(num(area), tipo, imovel));
  // mudou o tamanho do imóvel: refaz as distâncias que ainda estão automáticas
  const setC = (k: keyof typeof cfg, v: string) => {
    setCfg((p) => ({ ...p, [k]: v }));
    if (k === "area" || k === "imovel") { const area = k === "area" ? v : cfg.area, imovel = (k === "imovel" ? v : cfg.imovel) as TipoImovel;
      if (num(area) > 0) setLinhas((p) => p.map((l) => (l.auto ? { ...l, comprimento: dist(l.tipo, area, imovel) } : l))); }
  };
  const novo = (i: number): Linha => { const l = daPreset(i); return num(cfg.area) > 0 ? { ...l, comprimento: dist(l.tipo) } : l; };
  const exemplo = (lista: readonly (readonly [string, number])[], area: string, imovel: TipoImovel) => {
    const a = num(cfg.area) > 0 ? cfg.area : area, im = num(cfg.area) > 0 ? cfg.imovel : imovel;
    if (!(num(cfg.area) > 0)) setCfg((p) => ({ ...p, area: a, imovel: im }));
    setLinhas((p) => [...p, ...lista.map(([n, q]) => { const l = daPreset(byName(n)); return { ...l, quantidade: String(q), comprimento: dist(l.tipo, a, im) }; })]);
  };
  const upd = (id: number, f: Partial<Linha>) => setLinhas((p) => p.map((l) => (l.id === id ? { ...l, ...f } : l)));
  const grupos = [...new Set(PRESETS.map((p) => p.grupo))];

  const conf: ConfigObra = { entrada: cfg.entrada, metodo: cfg.metodo, temperatura: num(cfg.temperatura), quedaMax: num(cfg.quedaMax) || 4, agrupados: num(cfg.agrupados) || 1, distanciaEntradaM: num(cfg.distanciaEntradaM) || 1 };
  const cargas: Carga[] = linhas.map((l) => ({ nome: l.nome, potenciaW: num(l.potencia), quantidade: num(l.quantidade), comprimentoM: num(l.comprimento), tipo: l.tipo, areaMolhada: l.molhada, fp: l.fp, sistema: l.sistema, tensao: l.tensao }));
  const pj = useMemo(() => (cargas.some((c) => c.potenciaW > 0 && c.quantidade > 0) ? projetoCompleto(cargas, conf) : null), [JSON.stringify(cargas), JSON.stringify(conf)]); // eslint-disable-line react-hooks/exhaustive-deps

  const paraOrcamento = () => {
    if (!pj) return;
    try { sessionStorage.setItem("calc-materiais", JSON.stringify(pj.materiais.map((m) => ({ nome: m.nome, catalogo: m.catalogo, unidade: m.unidade, qtd: m.qtd })))); } catch { /* sem storage */ }
    router.push("/painel/orcamentos/novo?de=calculadora");
  };
  const L = "label", I = "input";

  return (
    <div className="grid gap-6 pb-20 lg:grid-cols-[1fr_420px] lg:pb-0">
      <div className="space-y-4">
        <section className="card space-y-3">
          <p className="text-lg font-bold text-navy">1. Dados da instalação</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={L} htmlFor="area">Área construída (m²)</label><input id="area" className={I} inputMode="decimal" placeholder="ex.: 80" value={cfg.area} onChange={(e) => setC("area", e.target.value)} /></div>
            <div><label className={L} htmlFor="imv">Tipo de imóvel</label><select id="imv" className={I} value={cfg.imovel} onChange={(e) => setC("imovel", e.target.value)}>{Object.entries(IMOVEIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <p className="-mt-1 text-xs text-muted">{num(cfg.area) > 0 ? <>Distâncias calculadas pela área: iluminação ~{dist("iluminacao")} m, tomadas ~{dist("tomadas")} m, chuveiro/ar ~{dist("dedicado")} m por circuito. Pode ajustar em cada carga.</> : "Informe a área para a quantidade de fio sair pelo tamanho do imóvel (sem área, cada carga usa 15 m)."}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={L} htmlFor="ent">Padrão de entrada</label><select id="ent" className={I} value={cfg.entrada} onChange={(e) => setC("entrada", e.target.value)}>{Object.entries(ENTRADAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className={L} htmlFor="dme">Distância medidor → quadro (m)</label><input id="dme" className={I} inputMode="decimal" value={cfg.distanciaEntradaM} onChange={(e) => setC("distanciaEntradaM", e.target.value)} /></div>
          </div>
          <div><label className={L} htmlFor="mm">Forma de instalação</label><select id="mm" className={I} value={cfg.metodo} onChange={(e) => setC("metodo", e.target.value)}>{Object.entries(METODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={L} htmlFor="mag">Circuitos por eletroduto</label><select id="mag" className={I} value={cfg.agrupados} onChange={(e) => setC("agrupados", e.target.value)}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select></div>
            <div><label className={L} htmlFor="mtp">Temperatura (°C)</label><select id="mtp" className={I} value={cfg.temperatura} onChange={(e) => setC("temperatura", e.target.value)}>{[25, 30, 35, 40].map((n) => <option key={n}>{n}</option>)}</select></div>
            <div><label className={L} htmlFor="mqd">Queda máx. (%)</label><select id="mqd" className={I} value={cfg.quedaMax} onChange={(e) => setC("quedaMax", e.target.value)}>{[2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></div>
          </div>
        </section>

        <section className="card space-y-3">
          <div className="flex items-center justify-between gap-2"><p className="text-lg font-bold text-navy">2. Cargas / circuitos</p>{linhas.length > 0 && <button type="button" className="text-sm font-bold text-red-700" onClick={() => setLinhas([])}>Limpar tudo</button>}</div>
          <BuscaAparelho onPick={(i) => setLinhas((p) => [...p, novo(i)])} />
          <select aria-label="Adicionar aparelho" className={I} value="" onChange={(e) => { const i = Number(e.target.value); if (e.target.value !== "") setLinhas((p) => [...p, novo(i)]); }}>
            <option value="">+ Ou escolha pela lista ({PRESETS.length} itens)…</option>
            {grupos.map((g) => <optgroup key={g} label={g}>{PRESETS.map((p, i) => (p.grupo === g ? <option key={p.nome} value={i}>{p.nome}</option> : null))}</optgroup>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-outline btn-sm" onClick={() => setLinhas((p) => [...p, linha(num(cfg.area) > 0 ? { comprimento: dist("tomadas") } : {})])}><IconPlus /> Carga personalizada</button>
            <button type="button" className="btn-outline btn-sm" onClick={() => exemplo(CASA, "120", "terrea")}><IconPlus /> Exemplo: casa 120 m²</button>
            <button type="button" className="btn-outline btn-sm col-span-2" onClick={() => exemplo(APTO, "75", "apartamento")}><IconPlus /> Exemplo: apartamento 75 m²</button>
          </div>
          {linhas.length === 0 && <p className="rounded-xl bg-light p-4 text-center text-muted">Adicione os aparelhos e circuitos da obra. Pode colocar vários: chuveiro, ar, tomadas, iluminação…</p>}
          {linhas.map((l) => (
            <div key={l.id} className="space-y-2 rounded-xl border border-line p-3">
              <div className="flex items-center gap-2">
                <input className="input py-2 font-bold" aria-label="Nome da carga" value={l.nome} onChange={(e) => upd(l.id, { nome: e.target.value })} />
                <button type="button" onClick={() => setLinhas((p) => p.filter((x) => x.id !== l.id))} className="p-2 text-red-700" aria-label="Remover carga"><IconTrash className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`q${l.id}`}>Qtd. circuitos</label><input id={`q${l.id}`} className="input py-2 text-right" inputMode="numeric" value={l.quantidade} onChange={(e) => upd(l.id, { quantidade: e.target.value })} /></div>
                <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`p${l.id}`}>Potência (W)</label><input id={`p${l.id}`} className="input py-2 text-right" inputMode="decimal" value={l.potencia} onChange={(e) => upd(l.id, { potencia: e.target.value })} /></div>
                <div><label className="text-[11px] font-bold uppercase text-muted" htmlFor={`d${l.id}`}>Distância (m)</label><input id={`d${l.id}`} className="input py-2 text-right" inputMode="decimal" value={l.comprimento} onChange={(e) => upd(l.id, { comprimento: e.target.value, auto: false })} />
                  {num(cfg.area) > 0 && (l.auto ? <span className="text-[11px] text-muted">pela área</span> : <button type="button" className="text-[11px] font-bold text-navy underline" onClick={() => upd(l.id, { comprimento: dist(l.tipo), auto: true })}>usar pela área</button>)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <select aria-label="Tipo de circuito" className="input w-auto py-1.5 text-sm" value={l.tipo} onChange={(e) => { const tipo = e.target.value as TipoCircuito; upd(l.id, { tipo, ...(l.auto && num(cfg.area) > 0 ? { comprimento: dist(tipo) } : {}) }); }}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={l.molhada} onChange={(e) => upd(l.id, { molhada: e.target.checked })} className="h-4 w-4 accent-navy" /> Área molhada</label>
                {l.sistema === "tri" && <span className="badge bg-brand text-navy">Trifásico {l.tensao} V</span>}
              </div>
            </div>
          ))}
        </section>
      </div>

      <aside id="resultado" className="scroll-mt-20 space-y-3 lg:sticky lg:top-6 lg:h-fit">
        {!pj ? <div className="card text-muted">Adicione pelo menos uma carga para ver o cálculo.</div> : (<>
          <div className="rounded-2xl bg-navy p-5 text-white">
            <p className="text-xs font-bold uppercase text-navy-soft">Resumo da obra · {pj.circuitos.length} circuito(s)</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Box k="Disjuntor geral" v={pj.geral.disjuntor ? `${pj.geral.disjuntor} A` : "—"} s={pj.polosGeral === 2 ? "bipolar" : "tripolar"} />
              <Box k="Cabo de entrada" v={pj.geral.secao ? `${fmt(pj.geral.secao)} mm²` : "—"} s={`terra ${fmt(pj.geral.terra)} mm²`} />
              <Box k="DR 30 mA" v={`${pj.dr.corrente} A`} s={pj.dr.polos === 2 ? "bipolar" : "tetrapolar"} />
              <Box k="Quadro" v={`${pj.quadro} disj.`} s={`${pj.modulos} usados + ${pj.reserva} reserva`} />
            </div>
          </div>
          <div className="card space-y-1.5 text-sm">
            <p className="flex justify-between"><span className="text-muted">Potência instalada</span><b>{fmt(pj.potenciaInstalada / 1000, 2)} kW</b></p>
            <p className="flex justify-between"><span className="text-muted">Demanda iluminação + tomadas (×{pj.fatorIlumTug})</span><b>{fmt(pj.demandaIlumTug / 1000, 2)} kVA</b></p>
            <p className="flex justify-between"><span className="text-muted">Demanda uso específico (×{pj.fatorTue})</span><b>{fmt(pj.demandaTue / 1000, 2)} kVA</b></p>
            <p className="flex justify-between border-t border-line pt-1.5"><span className="font-bold text-navy">Demanda total</span><b>{fmt(pj.demanda / 1000, 2)} kVA · {fmt(pj.correnteDemanda)} A por fase</b></p>
            <p className="flex justify-between"><span className="text-muted">DPS (proteção contra surto)</span><b>{pj.dps} un (fases + neutro)</b></p>
          </div>

          <div className="card p-0">
            <p className="rounded-t-2xl bg-navy px-4 py-2.5 text-sm font-bold uppercase text-white">Circuitos</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-light text-left text-[11px] uppercase text-muted"><tr><th className="px-3 py-2">#</th><th className="py-2">Carga</th><th className="py-2 text-right">Corrente</th><th className="py-2 text-right">Disj.</th><th className="px-3 py-2 text-right">Fio</th></tr></thead>
                <tbody className="divide-y divide-line">{pj.circuitos.map((c) => (
                  <tr key={c.n}><td className="px-3 py-2 text-muted">{c.n}</td><td className="py-2"><b className="text-navy">{c.carga.nome}</b>{c.r.dr === "obrigatorio" && <span className="ml-1 text-[11px] font-bold text-red-700">DR</span>}</td><td className="whitespace-nowrap py-2 pl-2 text-right">{fmt(c.r.ib)} A</td><td className="whitespace-nowrap py-2 pl-2 text-right font-bold">{c.r.disjuntor ?? "—"} A</td><td className="whitespace-nowrap px-3 py-2 text-right font-bold">{c.r.secao ? `${fmt(c.r.secao)} mm²` : "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div className="card p-0">
            <p className="rounded-t-2xl bg-navy px-4 py-2.5 text-sm font-bold uppercase text-white">Materiais necessários</p>
            <ul className="divide-y divide-line text-sm">{pj.materiais.map((m) => (
              <li key={m.chave} className="px-4 py-2.5">
                <div className="flex justify-between gap-3"><b className="text-navy">{m.nome}</b><b className="shrink-0">{fmt(m.qtd, 0)} {m.unidade}</b></div>
                {m.detalhe && <p className="mt-0.5 text-xs font-bold text-ink">{m.detalhe}</p>}
                {m.uso && <p className="mt-0.5 text-xs text-muted"><span className="font-bold">Onde usar:</span> {m.uso}</p>}
              </li>))}</ul>
            <div className="p-3"><button type="button" onClick={paraOrcamento} className="btn-primary w-full">Criar orçamento com esses materiais</button>
              <p className="mt-1.5 text-xs text-muted">Cabos com 10% de sobra{num(cfg.area) > 0 ? `, calculados para ${fmt(num(cfg.area), 0)} m² (${IMOVEIS[cfg.imovel].toLowerCase()})` : ""}. Preços vêm da sua tabela de materiais (com a sua margem). Eletrodutos, caixas e tomadas: adicione no orçamento.</p></div>
          </div>
          {pj.avisos.length > 0 && <ul className="card space-y-1 border-amber-200 bg-amber-50 text-sm text-amber-900">{pj.avisos.map((a) => <li key={a}>⚠ {a}</li>)}</ul>}
          <p className="text-xs text-muted">Cálculo de referência pela NBR 5410 (cobre, PVC 70 °C) com fatores de demanda usuais de projeto residencial. Confira as condições reais e as normas da concessionária; a responsabilidade técnica é do profissional.</p>
        </>)}
      </aside>
      {pj && (
        <a href="#resultado" className="fixed inset-x-3 bottom-[72px] z-30 flex items-center justify-between rounded-2xl border-2 border-brand bg-navy px-4 py-3 text-white shadow-lg lg:hidden">
          <span className="text-sm"><b>{pj.circuitos.length} circuitos</b> · geral <b className="text-brand">{pj.geral.disjuntor ?? "—"} A</b> · quadro <b className="text-brand">{pj.quadro}</b></span>
          <span className="text-sm font-bold text-brand">Ver resultado ↓</span>
        </a>
      )}
    </div>
  );
}

function Box({ k, v, s }: { k: string; v: string; s: string }) {
  return <div className="rounded-xl bg-white/10 p-3"><p className="text-[11px] font-bold uppercase text-navy-soft">{k}</p><p className="text-2xl font-bold text-brand">{v}</p><p className="text-xs text-navy-soft">{s}</p></div>;
}
