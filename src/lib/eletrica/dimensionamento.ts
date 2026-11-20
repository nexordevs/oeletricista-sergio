// Dimensionamento de circuitos de baixa tensão — referência ABNT NBR 5410.
// Condutores de COBRE com isolação de PVC (70 °C). Valores de referência:
// conferir sempre na norma e nas condições reais da instalação.

export type Metodo = "B1" | "B2" | "C" | "D";
export type Sistema = "mono" | "bi" | "tri"; // mono = F+N; bi = 2F (ou F+F+N com carga entre fases); tri = 3F

export const SECOES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120] as const;

// NBR 5410 — Tabela 36 (cobre, PVC, 30 °C ar / 20 °C solo). [2 condutores carregados, 3 condutores carregados]
const TAB36: Record<Metodo, [number, number][]> = {
  B1: [[17.5, 15.5], [24, 21], [32, 28], [41, 36], [57, 50], [76, 68], [101, 89], [125, 110], [151, 134], [192, 171], [232, 207], [269, 239]],
  B2: [[16.5, 15], [23, 20], [30, 27], [38, 34], [52, 46], [69, 62], [90, 80], [111, 99], [133, 118], [168, 149], [201, 179], [232, 206]],
  C: [[19.5, 17.5], [27, 24], [36, 32], [46, 41], [63, 57], [85, 76], [112, 96], [138, 119], [168, 144], [213, 184], [258, 223], [299, 259]],
  D: [[22, 18], [29, 24], [38, 31], [47, 39], [63, 52], [81, 67], [104, 86], [125, 103], [148, 122], [183, 151], [216, 179], [246, 203]],
};

export const METODOS: Record<Metodo, string> = {
  B1: "B1 – Fios em eletroduto (embutido ou aparente) — mais comum em residências",
  B2: "B2 – Cabo multipolar em eletroduto",
  C: "C – Cabos fixados em parede, canaleta aberta ou bandeja",
  D: "D – Cabos em eletroduto enterrado",
};

// NBR 5410 — Tabela 40 (PVC): fator de correção de temperatura (ar para B1/B2/C; solo para D)
const FT_AR: Record<number, number> = { 10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1.0, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71 };
const FT_SOLO: Record<number, number> = { 10: 1.1, 15: 1.05, 20: 1.0, 25: 0.95, 30: 0.89, 35: 0.84, 40: 0.77, 45: 0.71, 50: 0.63 };
// NBR 5410 — Tabela 42 (circuitos agrupados em feixe / mesmo eletroduto)
function fatorAgrupamento(n: number) {
  const t = [1, 1, 0.8, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52];
  if (n <= 8) return t[Math.max(1, n)];
  if (n <= 11) return 0.5;
  if (n <= 15) return 0.45;
  if (n <= 19) return 0.41;
  return 0.38;
}

export const DISJUNTORES = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125] as const;
const RHO = 1 / 56; // resistividade do cobre (Ω·mm²/m) usada na prática para queda de tensão

export type TipoCircuito = "iluminacao" | "tomadas" | "dedicado" | "motor";
export type Entrada = {
  potenciaW: number; tensao: number; sistema: Sistema; fp: number; comprimentoM: number;
  metodo: Metodo; temperatura: number; circuitosAgrupados: number; quedaMax: number; tipo: TipoCircuito; areaMolhada: boolean;
};
export type Resultado = {
  ib: number; fatorTemp: number; fatorAgrup: number; disjuntor: number | null; curva: "B" | "C";
  secao: number | null; iz: number | null; neutro: number | null; terra: number | null;
  quedaV: number | null; quedaPct: number | null; minimoNorma: number; motivoSecao: string;
  dr: "obrigatorio" | "recomendado"; avisos: string[];
};

const near = (tab: Record<number, number>, t: number) => {
  const k = Object.keys(tab).map(Number).reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
  // arredonda para a faixa mais quente (mais conservador) quando entre dois valores
  const up = Object.keys(tab).map(Number).filter((x) => x >= t).sort((a, b) => a - b)[0];
  return tab[up ?? k];
};
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function correnteProjeto(p: number, v: number, sistema: Sistema, fp: number) {
  const f = fp > 0 && fp <= 1 ? fp : 1;
  return sistema === "tri" ? p / (Math.sqrt(3) * v * f) : p / (v * f);
}

export function dimensionar(e: Entrada): Resultado {
  const avisos: string[] = [];
  const ib = correnteProjeto(e.potenciaW, e.tensao, e.sistema, e.fp);
  const carregados = e.sistema === "tri" ? 1 : 0; // índice na Tabela 36 (0 = 2 condutores, 1 = 3 condutores)
  const fatorTemp = e.metodo === "D" ? near(FT_SOLO, e.temperatura) : near(FT_AR, e.temperatura);
  const fatorAgrup = fatorAgrupamento(Math.max(1, Math.round(e.circuitosAgrupados)));
  const minimoNorma = e.tipo === "iluminacao" ? 1.5 : 2.5;
  const curva: "B" | "C" = e.tipo === "motor" ? "C" : "B";

  const disjuntor = DISJUNTORES.find((d) => d >= ib) ?? null;
  if (!disjuntor) avisos.push("Corrente acima de 125 A: projeto específico com disjuntor e condutores maiores.");

  let secao: number | null = null, iz: number | null = null, motivoSecao = "";
  let quedaV: number | null = null, quedaPct: number | null = null;
  const k = e.sistema === "tri" ? Math.sqrt(3) : 2;
  if (disjuntor) {
    for (let i = 0; i < SECOES.length; i++) {
      const s = SECOES[i];
      if (s < minimoNorma) continue;
      const izCorr = TAB36[e.metodo][i][carregados] * fatorTemp * fatorAgrup;
      if (izCorr < disjuntor) continue; // Ib ≤ In ≤ Iz
      const dv = (k * RHO * e.comprimentoM * ib) / s;
      const pct = (dv / e.tensao) * 100;
      if (pct > e.quedaMax) { motivoSecao = "queda de tensão"; continue; }
      secao = s; iz = izCorr; quedaV = dv; quedaPct = pct;
      if (!motivoSecao) motivoSecao = s === minimoNorma && izCorr >= disjuntor * 1.5 ? "seção mínima da norma" : "capacidade de corrente";
      break;
    }
    if (!secao) avisos.push("Nenhuma seção até 120 mm² atende: reduza o comprimento, aumente a tensão ou divida o circuito.");
  }
  // neutro: igual à fase em circuitos mono/bifásicos (e trifásicos até 25 mm²)
  const neutro = secao && (e.sistema !== "tri" || secao <= 25) ? secao : secao ? Math.max(25, secao / 2) : null;
  if (secao && e.sistema === "tri" && secao > 25) avisos.push("Neutro reduzido só é permitido sem harmônicas relevantes e com carga equilibrada (NBR 5410 6.2.6.2).");
  // condutor de proteção (terra) — NBR 5410 Tabela 58
  const terra = secao ? (secao <= 16 ? secao : secao <= 35 ? 16 : secao / 2) : null;

  const dr: Resultado["dr"] = e.areaMolhada ? "obrigatorio" : "recomendado";
  if (e.tipo === "motor") avisos.push("Motor: considere a corrente de partida (curva C/D ou disjuntor-motor) e a proteção por relé térmico.");
  if (e.fp < 1 && e.tipo !== "motor" && e.tipo !== "dedicado") avisos.push("Verifique o fator de potência na placa do equipamento.");
  if (ib > 0 && disjuntor && disjuntor / ib > 1.6) avisos.push("Disjuntor bem acima da corrente de projeto: confira se a potência informada está correta.");

  return {
    ib: r1(ib), fatorTemp, fatorAgrup, disjuntor, curva, secao, iz: iz ? r1(iz) : null, neutro, terra,
    quedaV: quedaV != null ? r2(quedaV) : null, quedaPct: quedaPct != null ? r2(quedaPct) : null,
    minimoNorma, motivoSecao, dr, avisos,
  };
}

// Aparelhos comuns — potências TÍPICAS (sempre usar a da placa do equipamento)
export const PRESETS: { nome: string; w: number; fp: number; tipo: TipoCircuito; molhada?: boolean }[] = [
  { nome: "Chuveiro 5.500 W", w: 5500, fp: 1, tipo: "dedicado", molhada: true },
  { nome: "Chuveiro 6.800 W", w: 6800, fp: 1, tipo: "dedicado", molhada: true },
  { nome: "Chuveiro 7.500 W", w: 7500, fp: 1, tipo: "dedicado", molhada: true },
  { nome: "Torneira elétrica 5.500 W", w: 5500, fp: 1, tipo: "dedicado", molhada: true },
  { nome: "Ar-condicionado 9.000 BTU (~900 W)", w: 900, fp: 0.9, tipo: "dedicado" },
  { nome: "Ar-condicionado 12.000 BTU (~1.200 W)", w: 1200, fp: 0.9, tipo: "dedicado" },
  { nome: "Ar-condicionado 18.000 BTU (~1.800 W)", w: 1800, fp: 0.9, tipo: "dedicado" },
  { nome: "Ar-condicionado 24.000 BTU (~2.400 W)", w: 2400, fp: 0.9, tipo: "dedicado" },
  { nome: "Forno elétrico de embutir (~3.000 W)", w: 3000, fp: 1, tipo: "dedicado" },
  { nome: "Cooktop de indução 4 bocas (~7.000 W)", w: 7000, fp: 1, tipo: "dedicado" },
  { nome: "Micro-ondas (~1.500 W)", w: 1500, fp: 1, tipo: "tomadas" },
  { nome: "Máquina de lavar (~1.000 W)", w: 1000, fp: 0.9, tipo: "tomadas", molhada: true },
  { nome: "Circuito de tomadas de cozinha (~2.000 VA)", w: 2000, fp: 1, tipo: "tomadas", molhada: true },
  { nome: "Circuito de iluminação (~1.000 W)", w: 1000, fp: 1, tipo: "iluminacao" },
  { nome: "Carregador veicular 7,4 kW", w: 7400, fp: 1, tipo: "dedicado" },
];
