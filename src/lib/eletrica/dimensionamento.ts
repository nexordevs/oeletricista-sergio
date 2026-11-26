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

// Aparelhos e circuitos comuns — potências TÍPICAS de referência (sempre usar a da placa / projeto)
export type Preset = { grupo: string; nome: string; w: number; fp: number; tipo: TipoCircuito; molhada?: boolean; sistema?: Sistema; tensao?: number };
const g = (grupo: string, itens: Omit<Preset, "grupo">[]) => itens.map((x) => ({ grupo, ...x }));
export const PRESETS: Preset[] = [
  ...g("Chuveiros e aquecimento de água", [
    { nome: "Chuveiro 4.400 W", w: 4400, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Chuveiro 5.500 W", w: 5500, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Chuveiro 6.400 W", w: 6400, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Chuveiro 6.800 W", w: 6800, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Chuveiro 7.500 W", w: 7500, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Chuveiro 7.800 W", w: 7800, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Chuveiro 127 V – 4.400 W", w: 4400, fp: 1, tipo: "dedicado", molhada: true, tensao: 127 },
    { nome: "Chuveiro 127 V – 5.400 W", w: 5400, fp: 1, tipo: "dedicado", molhada: true, tensao: 127 },
    { nome: "Ducha higiênica com aquecimento (~700 W)", w: 700, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Torneira elétrica 5.500 W", w: 5500, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Torneira elétrica de cozinha 3.500 W", w: 3500, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Aquecedor de passagem elétrico (~8.000 W)", w: 8000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Boiler / aquecedor de acumulação (~2.000 W)", w: 2000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Boiler 200 L+ (~3.000 W)", w: 3000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Aquecedor solar – apoio elétrico (~2.500 W)", w: 2500, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Bomba de calor para água (~1.200 W)", w: 1200, fp: 0.9, tipo: "dedicado", molhada: true },
    { nome: "Aquecedor a gás de passagem – parte elétrica (~60 W)", w: 60, fp: 0.9, tipo: "tomadas", molhada: true },
  ]),
  ...g("Ar-condicionado (split)", [
    { nome: "Ar 7.500 BTU (~700 W)", w: 700, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar 9.000 BTU (~900 W)", w: 900, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar 12.000 BTU (~1.200 W)", w: 1200, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar 18.000 BTU (~1.800 W)", w: 1800, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar 22.000 BTU (~2.200 W)", w: 2200, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar 24.000 BTU (~2.400 W)", w: 2400, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar 30.000 BTU (~3.000 W)", w: 3000, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar 36.000 BTU (~3.600 W)", w: 3600, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar piso-teto 48.000 BTU trifásico (~4.800 W)", w: 4800, fp: 0.9, tipo: "dedicado", sistema: "tri", tensao: 380 },
    { nome: "Split inverter 9.000 BTU (~800 W)", w: 800, fp: 0.95, tipo: "dedicado" },
    { nome: "Split inverter 12.000 BTU (~1.100 W)", w: 1100, fp: 0.95, tipo: "dedicado" },
    { nome: "Split inverter 18.000 BTU (~1.650 W)", w: 1650, fp: 0.95, tipo: "dedicado" },
    { nome: "Split inverter 24.000 BTU (~2.200 W)", w: 2200, fp: 0.95, tipo: "dedicado" },
    { nome: "Multi-split 2 evaporadoras (~2.500 W)", w: 2500, fp: 0.95, tipo: "dedicado" },
    { nome: "Ar de janela 7.500 BTU (~1.000 W)", w: 1000, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar de janela 10.000 BTU (~1.300 W)", w: 1300, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar de janela 12.000 BTU (~1.500 W)", w: 1500, fp: 0.9, tipo: "dedicado" },
    { nome: "Ar portátil 12.000 BTU (~1.300 W)", w: 1300, fp: 0.9, tipo: "dedicado" },
  ]),
  ...g("Ventilação e clima", [
    { nome: "Ventilador de teto (~130 W)", w: 130, fp: 0.9, tipo: "tomadas" },
    { nome: "Ventilador de teto com luminária (~250 W)", w: 250, fp: 0.9, tipo: "iluminacao" },
    { nome: "Ventilador de coluna / mesa (~130 W)", w: 130, fp: 0.9, tipo: "tomadas" },
    { nome: "Circulador de ar (~150 W)", w: 150, fp: 0.9, tipo: "tomadas" },
    { nome: "Climatizador evaporativo (~200 W)", w: 200, fp: 0.9, tipo: "tomadas" },
    { nome: "Desumidificador (~300 W)", w: 300, fp: 0.9, tipo: "tomadas" },
    { nome: "Aquecedor de ambiente (~1.500 W)", w: 1500, fp: 1, tipo: "dedicado" },
    { nome: "Aquecedor a óleo (~1.500 W)", w: 1500, fp: 1, tipo: "tomadas" },
    { nome: "Termoventilador (~2.000 W)", w: 2000, fp: 1, tipo: "dedicado" },
    { nome: "Exaustor de banheiro (~40 W)", w: 40, fp: 0.9, tipo: "iluminacao", molhada: true },
    { nome: "Cortina de ar (~250 W)", w: 250, fp: 0.9, tipo: "tomadas" },
  ]),
  ...g("Cozinha", [
    { nome: "Tomadas da cozinha (~1.900 VA)", w: 1900, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Micro-ondas (~1.500 W)", w: 1500, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Micro-ondas de embutir com grill (~2.200 W)", w: 2200, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Forno elétrico de embutir (~3.000 W)", w: 3000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Forno elétrico de bancada 45 L (~1.800 W)", w: 1800, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Fogão elétrico 4 bocas com forno (~8.000 W)", w: 8000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Cooktop de indução 1 boca portátil (~2.000 W)", w: 2000, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Cooktop de indução 2 bocas (~3.500 W)", w: 3500, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Cooktop de indução 4 bocas (~7.000 W)", w: 7000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Cooktop de indução 5 bocas (~9.000 W)", w: 9000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Cooktop elétrico vitrocerâmico 4 bocas (~6.000 W)", w: 6000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Fogão a gás com acendimento elétrico (~50 W)", w: 50, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Air fryer (~1.500 W)", w: 1500, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Air fryer forno 12 L (~1.800 W)", w: 1800, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Lava-louças 8 serviços (~1.500 W)", w: 1500, fp: 0.95, tipo: "dedicado", molhada: true },
    { nome: "Lava-louças 14 serviços (~2.000 W)", w: 2000, fp: 0.95, tipo: "dedicado", molhada: true },
    { nome: "Coifa / depurador (~300 W)", w: 300, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Coifa de ilha (~400 W)", w: 400, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Geladeira / freezer (~350 W)", w: 350, fp: 0.85, tipo: "tomadas", molhada: true },
    { nome: "Geladeira frost free duplex (~450 W)", w: 450, fp: 0.85, tipo: "tomadas", molhada: true },
    { nome: "Geladeira side by side / inverse (~600 W)", w: 600, fp: 0.85, tipo: "tomadas", molhada: true },
    { nome: "Freezer vertical ou horizontal (~300 W)", w: 300, fp: 0.85, tipo: "tomadas", molhada: true },
    { nome: "Frigobar (~100 W)", w: 100, fp: 0.85, tipo: "tomadas" },
    { nome: "Adega climatizada (~120 W)", w: 120, fp: 0.85, tipo: "tomadas" },
    { nome: "Cervejeira (~200 W)", w: 200, fp: 0.85, tipo: "tomadas" },
    { nome: "Purificador / bebedouro (~150 W)", w: 150, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Cafeteira elétrica (~800 W)", w: 800, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Cafeteira de cápsula / espresso (~1.300 W)", w: 1300, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Chaleira elétrica (~1.800 W)", w: 1800, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Liquidificador (~1.000 W)", w: 1000, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Batedeira (~500 W)", w: 500, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Batedeira planetária (~1.000 W)", w: 1000, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Multiprocessador (~800 W)", w: 800, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Mixer / processador pequeno (~400 W)", w: 400, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Sanduicheira / grill (~1.000 W)", w: 1000, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Torradeira (~800 W)", w: 800, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Panela elétrica de arroz (~600 W)", w: 600, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Panela de pressão elétrica (~1.000 W)", w: 1000, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Máquina de pão (~600 W)", w: 600, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Triturador de pia (~550 W)", w: 550, fp: 0.8, tipo: "tomadas", molhada: true },
    { nome: "Sorveteira / iogurteira (~200 W)", w: 200, fp: 0.9, tipo: "tomadas", molhada: true },
  ]),
  ...g("Lavanderia e área de serviço", [
    { nome: "Tomadas da área de serviço (~1.800 VA)", w: 1800, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Máquina de lavar (~1.000 W)", w: 1000, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Máquina de lavar 15 kg+ com aquecimento (~1.800 W)", w: 1800, fp: 0.95, tipo: "dedicado", molhada: true },
    { nome: "Lava e seca (~2.000 W)", w: 2000, fp: 0.95, tipo: "dedicado", molhada: true },
    { nome: "Secadora de roupas (~2.500 W)", w: 2500, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Tanquinho (~400 W)", w: 400, fp: 0.85, tipo: "tomadas", molhada: true },
    { nome: "Centrífuga de roupas (~300 W)", w: 300, fp: 0.85, tipo: "tomadas", molhada: true },
    { nome: "Ferro de passar (~1.200 W)", w: 1200, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Ferro a vapor vertical (~1.500 W)", w: 1500, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Aspirador de pó (~1.200 W)", w: 1200, fp: 0.9, tipo: "tomadas" },
    { nome: "Aspirador robô / vertical (~100 W)", w: 100, fp: 0.9, tipo: "tomadas" },
    { nome: "Lavadora de alta pressão (~1.900 W)", w: 1900, fp: 0.85, tipo: "tomadas", molhada: true },
  ]),
  ...g("Banheiro e cuidados pessoais", [
    { nome: "Tomadas do banheiro (~600 VA)", w: 600, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Secador / chapinha (~2.000 W)", w: 2000, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Secador de cabelo profissional (~2.400 W)", w: 2400, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Chapinha / modelador (~200 W)", w: 200, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Toalheiro térmico (~150 W)", w: 150, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Aquecedor de banheiro (~2.000 W)", w: 2000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Espelho com LED e desembaçador (~100 W)", w: 100, fp: 0.95, tipo: "iluminacao", molhada: true },
    { nome: "Banheira simples – motor (~700 W)", w: 700, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Banheira de hidromassagem com aquecedor (~5.000 W)", w: 5000, fp: 0.95, tipo: "dedicado", molhada: true },
  ]),
  ...g("Tomadas por cômodo (TUG)", [
    { nome: "Tomadas de sala/quartos (~1.200 VA)", w: 1200, fp: 1, tipo: "tomadas" },
    { nome: "Tomadas da suíte (~1.200 VA)", w: 1200, fp: 1, tipo: "tomadas" },
    { nome: "Tomadas da copa (~1.800 VA)", w: 1800, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Tomadas da varanda gourmet (~1.800 VA)", w: 1800, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Tomadas da área externa / varanda (~600 VA)", w: 600, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Tomadas da garagem (~1.000 VA)", w: 1000, fp: 1, tipo: "tomadas", molhada: true },
    { nome: "Tomadas do corredor / hall (~200 VA)", w: 200, fp: 1, tipo: "tomadas" },
    { nome: "Tomadas do escritório / home office (~1.200 VA)", w: 1200, fp: 1, tipo: "tomadas" },
    { nome: "Tomadas do quarto de empregada / dependência (~600 VA)", w: 600, fp: 1, tipo: "tomadas" },
  ]),
  ...g("TV, informática e escritório", [
    { nome: "TV LED 32–43\" (~100 W)", w: 100, fp: 0.95, tipo: "tomadas" },
    { nome: "TV LED 50–65\" (~200 W)", w: 200, fp: 0.95, tipo: "tomadas" },
    { nome: "TV 75\"+ (~350 W)", w: 350, fp: 0.95, tipo: "tomadas" },
    { nome: "Rack de TV completo: TV, som e videogame (~700 VA)", w: 700, fp: 0.95, tipo: "tomadas" },
    { nome: "Home theater / soundbar (~300 W)", w: 300, fp: 0.95, tipo: "tomadas" },
    { nome: "Videogame (~200 W)", w: 200, fp: 0.95, tipo: "tomadas" },
    { nome: "Computador com monitor (~300 W)", w: 300, fp: 0.95, tipo: "tomadas" },
    { nome: "PC gamer com monitor (~800 W)", w: 800, fp: 0.95, tipo: "tomadas" },
    { nome: "Notebook (~90 W)", w: 90, fp: 0.95, tipo: "tomadas" },
    { nome: "Impressora jato de tinta (~30 W)", w: 30, fp: 0.95, tipo: "tomadas" },
    { nome: "Impressora laser (~600 W)", w: 600, fp: 0.95, tipo: "tomadas" },
    { nome: "Modem, roteador e ONU de internet (~50 W)", w: 50, fp: 0.95, tipo: "tomadas" },
    { nome: "Nobreak 1.500 VA (~1.000 W)", w: 1000, fp: 0.9, tipo: "tomadas" },
    { nome: "Aquário com filtro e termostato (~300 W)", w: 300, fp: 0.9, tipo: "tomadas", molhada: true },
  ]),
  ...g("Iluminação", [
    { nome: "Iluminação interna da casa (~1.000 W)", w: 1000, fp: 1, tipo: "iluminacao" },
    { nome: "Iluminação de apartamento 2 quartos – LED (~400 W)", w: 400, fp: 0.95, tipo: "iluminacao" },
    { nome: "Iluminação de apartamento 3 quartos – LED (~600 W)", w: 600, fp: 0.95, tipo: "iluminacao" },
    { nome: "Iluminação de casa grande – LED (~1.500 W)", w: 1500, fp: 0.95, tipo: "iluminacao" },
    { nome: "Spots / trilho LED da sala (~250 W)", w: 250, fp: 0.95, tipo: "iluminacao" },
    { nome: "Lustre / pendentes (~200 W)", w: 200, fp: 0.95, tipo: "iluminacao" },
    { nome: "Iluminação externa / jardim (~500 W)", w: 500, fp: 1, tipo: "iluminacao", molhada: true },
    { nome: "Refletores LED externos (~600 W)", w: 600, fp: 0.95, tipo: "iluminacao", molhada: true },
    { nome: "Arandelas e balizadores da fachada (~200 W)", w: 200, fp: 0.95, tipo: "iluminacao", molhada: true },
    { nome: "Fita de LED com fontes (~300 W)", w: 300, fp: 0.9, tipo: "iluminacao" },
    { nome: "Iluminação de garagem coletiva (~1.500 W)", w: 1500, fp: 0.95, tipo: "iluminacao" },
  ]),
  ...g("Bombas, portões e motores", [
    { nome: "Bomba d'água 1/3 cv monofásica (~450 W)", w: 450, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Bomba d'água 1/2 cv monofásica (~600 W)", w: 600, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Bomba d'água 3/4 cv monofásica (~850 W)", w: 850, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Bomba d'água 1 cv monofásica (~1.100 W)", w: 1100, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Bomba d'água 1,5 cv monofásica (~1.500 W)", w: 1500, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Bomba d'água 2 cv monofásica (~1.900 W)", w: 1900, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Bomba submersa de poço 1 cv (~1.100 W)", w: 1100, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Bomba de drenagem / cisterna (~400 W)", w: 400, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Pressurizador (~400 W)", w: 400, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Portão eletrônico (~500 W)", w: 500, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Portão basculante / pivotante pesado (~750 W)", w: 750, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Motor trifásico 1 cv (~1.000 W)", w: 1000, fp: 0.8, tipo: "motor", sistema: "tri", tensao: 380 },
    { nome: "Motor trifásico 3 cv (~2.800 W)", w: 2800, fp: 0.85, tipo: "motor", sistema: "tri", tensao: 380 },
    { nome: "Motor trifásico 5 cv (~4.500 W)", w: 4500, fp: 0.85, tipo: "motor", sistema: "tri", tensao: 380 },
    { nome: "Compressor de ar 2 hp (~1.700 W)", w: 1700, fp: 0.8, tipo: "motor" },
  ]),
  ...g("Segurança e automação", [
    { nome: "Cerca elétrica – central (~50 W)", w: 50, fp: 0.9, tipo: "tomadas" },
    { nome: "CFTV com DVR e câmeras (~100 W)", w: 100, fp: 0.9, tipo: "tomadas" },
    { nome: "Interfone / vídeo-porteiro (~30 W)", w: 30, fp: 0.9, tipo: "tomadas" },
    { nome: "Alarme e sensores (~30 W)", w: 30, fp: 0.9, tipo: "tomadas" },
    { nome: "Central de automação / Wi-Fi (~50 W)", w: 50, fp: 0.9, tipo: "tomadas" },
    { nome: "Cortina / persiana motorizada (~150 W)", w: 150, fp: 0.8, tipo: "tomadas" },
  ]),
  ...g("Garagem e ferramentas", [
    { nome: "Furadeira / parafusadeira (~700 W)", w: 700, fp: 0.85, tipo: "tomadas" },
    { nome: "Esmerilhadeira / lixadeira (~900 W)", w: 900, fp: 0.85, tipo: "tomadas" },
    { nome: "Serra circular / tico-tico (~1.400 W)", w: 1400, fp: 0.85, tipo: "tomadas" },
    { nome: "Máquina de solda inversora (~4.500 W)", w: 4500, fp: 0.9, tipo: "dedicado" },
    { nome: "Betoneira 400 L monofásica (~1.500 W)", w: 1500, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Cortador de grama elétrico (~1.200 W)", w: 1200, fp: 0.85, tipo: "tomadas", molhada: true },
    { nome: "Aparador de cerca viva (~500 W)", w: 500, fp: 0.85, tipo: "tomadas", molhada: true },
  ]),
  ...g("Lazer: piscina, sauna, churrasqueira e spa", [
    { nome: "Bomba de piscina 1/4 cv (~350 W)", w: 350, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Bomba de piscina 1/2 cv (~600 W)", w: 600, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Bomba de piscina 3/4 cv (~850 W)", w: 850, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Bomba de piscina 1 cv (~1.100 W)", w: 1100, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Aquecedor de piscina / trocador de calor (~4.000 W)", w: 4000, fp: 0.9, tipo: "dedicado", molhada: true },
    { nome: "Gerador de cloro (~200 W)", w: 200, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Iluminação de piscina LED (~100 W)", w: 100, fp: 0.95, tipo: "iluminacao", molhada: true },
    { nome: "Sauna seca elétrica (~6.000 W)", w: 6000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Sauna a vapor – gerador 9 kW (~9.000 W)", w: 9000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Ofurô / spa aquecido (~3.000 W)", w: 3000, fp: 0.95, tipo: "dedicado", molhada: true },
    { nome: "Churrasqueira elétrica (~2.000 W)", w: 2000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Forno de pizza elétrico (~3.500 W)", w: 3500, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Coifa da churrasqueira (~300 W)", w: 300, fp: 0.9, tipo: "tomadas", molhada: true },
    { nome: "Chopeira elétrica (~300 W)", w: 300, fp: 0.85, tipo: "tomadas", molhada: true },
    { nome: "Esteira ergométrica (~1.500 W)", w: 1500, fp: 0.85, tipo: "dedicado" },
  ]),
  ...g("Saúde em casa", [
    { nome: "Concentrador de oxigênio (~400 W)", w: 400, fp: 0.9, tipo: "dedicado" },
    { nome: "Cama hospitalar elétrica (~200 W)", w: 200, fp: 0.85, tipo: "tomadas" },
    { nome: "Nebulizador / CPAP (~100 W)", w: 100, fp: 0.9, tipo: "tomadas" },
  ]),
  ...g("Carregador veicular", [
    { nome: "Carregador de patinete / bike elétrica (~300 W)", w: 300, fp: 0.95, tipo: "tomadas", molhada: true },
    { nome: "Carregador de moto elétrica (~1.500 W)", w: 1500, fp: 0.95, tipo: "dedicado", molhada: true },
    { nome: "Carregador veicular 3,7 kW", w: 3700, fp: 1, tipo: "dedicado" },
    { nome: "Carregador veicular 7,4 kW", w: 7400, fp: 1, tipo: "dedicado" },
    { nome: "Carregador veicular 11 kW trifásico", w: 11000, fp: 1, tipo: "dedicado", sistema: "tri", tensao: 380 },
  ]),
  ...g("Predial / condomínio", [
    { nome: "Iluminação de escadas e corredores (~800 W)", w: 800, fp: 0.95, tipo: "iluminacao" },
    { nome: "Tomadas de área comum / salão de festas (~2.000 VA)", w: 2000, fp: 1, tipo: "tomadas" },
    { nome: "Bomba de recalque 2 cv trifásica (~1.900 W)", w: 1900, fp: 0.85, tipo: "motor", sistema: "tri", tensao: 380 },
    { nome: "Bomba de recalque 3 cv trifásica (~2.800 W)", w: 2800, fp: 0.85, tipo: "motor", sistema: "tri", tensao: 380 },
    { nome: "Portão de garagem do condomínio (~600 W)", w: 600, fp: 0.8, tipo: "motor", molhada: true },
    { nome: "Interfone, CFTV e cerca elétrica (~300 W)", w: 300, fp: 0.9, tipo: "tomadas" },
    { nome: "Iluminação de emergência / central (~200 W)", w: 200, fp: 0.9, tipo: "iluminacao" },
  ]),
  ...g("Comercial", [
    { nome: "Freezer horizontal / expositor refrigerado (~500 W)", w: 500, fp: 0.85, tipo: "dedicado" },
    { nome: "Fritadeira elétrica (~3.000 W)", w: 3000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Forno elétrico comercial (~6.000 W)", w: 6000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Chapa / grill elétrico (~2.500 W)", w: 2500, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Máquina de café espresso (~2.000 W)", w: 2000, fp: 1, tipo: "dedicado", molhada: true },
    { nome: "Iluminação de loja (~1.500 W)", w: 1500, fp: 0.95, tipo: "iluminacao" },
    { nome: "Tomadas de balcão / caixa (~1.200 VA)", w: 1200, fp: 1, tipo: "tomadas" },
  ]),
];

// ─────────────────────────────────────────────────────────────────────────────
// VÁRIOS CIRCUITOS DE UMA VEZ: circuitos + demanda + entrada + quadro + materiais
// ─────────────────────────────────────────────────────────────────────────────
export type Entrada3 = "mono" | "bi" | "tri"; // padrão de entrada: F+N 220 V | 2F+N 380/220 V | 3F+N 380/220 V
export type Carga = { nome: string; potenciaW: number; quantidade: number; comprimentoM: number; tipo: TipoCircuito; areaMolhada: boolean; fp: number; sistema: Sistema; tensao: number };
export type ConfigObra = { entrada: Entrada3; metodo: Metodo; temperatura: number; quedaMax: number; agrupados: number; distanciaEntradaM: number };
export type CircuitoCalc = { n: number; carga: Carga; r: Resultado; polos: 1 | 2 | 3 };
export type ItemMaterial = { chave: string; nome: string; catalogo: string | null; unidade: string; qtd: number };
export type Projeto = {
  circuitos: CircuitoCalc[]; potenciaInstalada: number; demandaIlumTug: number; demandaTue: number; demanda: number;
  fatorIlumTug: number; fatorTue: number; correnteDemanda: number; geral: Resultado; polosGeral: 2 | 3;
  dr: { polos: 2 | 4; corrente: number; motivo: string }; dps: number; modulos: number; reserva: number; quadro: number;
  materiais: ItemMaterial[]; avisos: string[];
};

// Fatores de demanda de REFERÊNCIA (método usual em projeto residencial; a concessionária pode exigir outro)
function fatorIlumTug(kw: number) {
  const t = [0.86, 0.75, 0.66, 0.59, 0.52, 0.45, 0.4, 0.35, 0.31, 0.27];
  return kw <= 0 ? 1 : kw > 10 ? 0.24 : t[Math.min(9, Math.ceil(kw) - 1)];
}
function fatorTue(n: number) {
  const t = [1, 1, 1, 0.84, 0.76, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52, 0.49, 0.48, 0.46, 0.45, 0.44, 0.43];
  return n <= 16 ? t[Math.max(0, n)] : n <= 20 ? 0.4 : n <= 25 ? 0.39 : 0.38;
}
const TENSAO_FN = 220;
const QUADROS = [6, 8, 12, 18, 24, 36, 48];
const bitola = (s: number) => String(s).replace(".", ",");
export const ENTRADAS: Record<Entrada3, string> = { mono: "Monofásico 220 V (F + N)", bi: "Bifásico 380/220 V (2F + N)", tri: "Trifásico 380/220 V (3F + N)" };

function nomeDisjuntor(polos: number, a: number): string | null {
  if (polos === 1) return a <= 32 ? "Disjuntor DIN unipolar 6 a 32 A" : a <= 40 ? "Disjuntor DIN unipolar 40 A" : a <= 50 ? "Disjuntor DIN unipolar 50 A" : a <= 63 ? "Disjuntor DIN unipolar 63 A" : null;
  if (polos === 2) return a <= 32 ? "Disjuntor DIN bipolar 10 a 32 A" : a <= 63 ? "Disjuntor DIN bipolar 40 a 63 A" : null;
  return a <= 32 ? "Disjuntor DIN tripolar 10 a 32 A" : a <= 63 ? "Disjuntor DIN tripolar 40 a 63 A" : a <= 100 ? "Disjuntor DIN tripolar 80 a 100 A" : null;
}
const ordem = (k: string) => {
  const [t, x, y] = k.split("-");
  if (t === "cabo") return Number(x);
  if (t === "dj") return 1000 + Number(x) * 1000 + Number(y);
  return 10000 + ["geral", "dr", "dps", "quadro", "barr", "neutro"].indexOf(t);
};
const nomeCabo = (s: number) => (s <= 35 ? `Cabo flexível ${bitola(s)} mm² 750 V` : null);

export function projetoCompleto(cargas: Carga[], cfg: ConfigObra): Projeto {
  const avisos: string[] = [];
  const circuitos: CircuitoCalc[] = [];
  let n = 0;
  for (const c of cargas) {
    if (!(c.potenciaW > 0) || !(c.quantidade > 0)) continue;
    const r = dimensionar({ potenciaW: c.potenciaW, tensao: c.tensao, sistema: c.sistema, fp: c.fp || 1, comprimentoM: Math.max(1, c.comprimentoM), metodo: cfg.metodo, temperatura: cfg.temperatura, circuitosAgrupados: cfg.agrupados, quedaMax: cfg.quedaMax, tipo: c.tipo, areaMolhada: c.areaMolhada });
    const polos: 1 | 2 | 3 = c.sistema === "tri" ? 3 : c.sistema === "bi" ? 2 : 1;
    for (let i = 0; i < Math.round(c.quantidade); i++) circuitos.push({ n: ++n, carga: c, r, polos });
  }
  if (circuitos.some((c) => c.polos === 3) && cfg.entrada !== "tri") avisos.push("Há carga trifásica: a entrada precisa ser trifásica.");
  if (circuitos.some((c) => c.polos === 2) && cfg.entrada === "mono") avisos.push("Há carga bifásica (F + F): a entrada precisa ser bifásica ou trifásica.");

  // Demanda
  const pot = (c: CircuitoCalc) => c.carga.potenciaW / (c.carga.fp || 1); // VA
  const ilumTug = circuitos.filter((c) => c.carga.tipo === "iluminacao" || c.carga.tipo === "tomadas").reduce((a, c) => a + pot(c), 0);
  const tue = circuitos.filter((c) => c.carga.tipo === "dedicado" || c.carga.tipo === "motor");
  const tueVa = tue.reduce((a, c) => a + pot(c), 0);
  const fIT = fatorIlumTug(ilumTug / 1000), fT = fatorTue(tue.length);
  const demanda = ilumTug * fIT + tueVa * fT;
  const fases = cfg.entrada === "tri" ? 3 : cfg.entrada === "bi" ? 2 : 1;
  const correnteDemanda = demanda / (fases * TENSAO_FN);
  const polosGeral: 2 | 3 = fases === 3 ? 3 : 2; // geral bipolar na entrada mono (corta fase e neutro) e bifásica

  // Disjuntor geral e cabo de entrada (alimentador medidor → quadro)
  const geral = dimensionar({ potenciaW: correnteDemanda * TENSAO_FN, tensao: TENSAO_FN, sistema: "mono", fp: 1, comprimentoM: Math.max(1, cfg.distanciaEntradaM), metodo: cfg.metodo, temperatura: cfg.temperatura, circuitosAgrupados: 1, quedaMax: Math.min(cfg.quedaMax, 3), tipo: "dedicado", areaMolhada: false });
  if (fases === 1 && correnteDemanda > 63) avisos.push("Demanda alta para entrada monofásica: avalie bifásica ou trifásica (consulte a concessionária).");
  if (fases === 2 && correnteDemanda > 63) avisos.push("Demanda alta para entrada bifásica: avalie trifásica (consulte a concessionária).");
  avisos.push("O disjuntor geral final segue a categoria de atendimento da concessionária (ex.: Energisa) — confira a tabela dela.");

  // DR, DPS e quadro
  const molhada = circuitos.some((c) => c.carga.areaMolhada);
  const drPolos: 2 | 4 = fases === 1 ? 2 : 4;
  const drCorrente = [25, 40, 63, 80, 100].find((x) => x >= (geral.disjuntor ?? 0)) ?? 100;
  const dps = fases + 1;
  const modulos = circuitos.reduce((a, c) => a + c.polos, 0) + polosGeral + drPolos + dps;
  const reserva = Math.max(2, Math.ceil(modulos * 0.2));
  const quadro = QUADROS.find((q) => q >= modulos + reserva) ?? 48;
  if (modulos + reserva > 48) avisos.push("Muitos circuitos: use quadro maior ou divida em quadros parciais.");

  // Lista de materiais
  const mat = new Map<string, ItemMaterial>();
  const add = (chave: string, nome: string, catalogo: string | null, unidade: string, qtd: number) => {
    const ex = mat.get(chave); if (ex) ex.qtd += qtd; else mat.set(chave, { chave, nome, catalogo, unidade, qtd });
  };
  const cabo = (s: number | null, metros: number) => { if (s && metros > 0) add(`cabo-${s}`, `Cabo flexível ${bitola(s)} mm² 750 V`, nomeCabo(s), "m", metros); };
  for (const c of circuitos) {
    const L = Math.max(1, c.carga.comprimentoM);
    const condutoresFase = c.polos === 1 ? 2 : c.polos; // F+N | 2F | 3F
    cabo(c.r.secao, L * condutoresFase);
    cabo(c.r.terra, L);
    if (c.r.disjuntor) add(`dj-${c.polos}-${c.r.disjuntor}`, `Disjuntor DIN ${["", "unipolar", "bipolar", "tripolar"][c.polos]} ${c.r.disjuntor} A curva ${c.r.curva}`, nomeDisjuntor(c.polos, c.r.disjuntor), "un", 1);
  }
  cabo(geral.secao, Math.max(1, cfg.distanciaEntradaM) * (fases + 1));
  cabo(geral.terra, Math.max(1, cfg.distanciaEntradaM));
  if (geral.disjuntor) add(`geral`, `Disjuntor geral ${polosGeral === 2 ? "bipolar" : "tripolar"} ${geral.disjuntor} A`, nomeDisjuntor(polosGeral, geral.disjuntor), "un", 1);
  add("dr", `Interruptor DR ${drPolos === 2 ? "bipolar" : "tetrapolar"} ${drCorrente} A 30 mA`, drPolos === 2 ? (drCorrente <= 40 ? "Interruptor DR bipolar 25/40 A 30 mA" : null) : drCorrente <= 40 ? "Interruptor DR tetrapolar 40 A 30 mA" : drCorrente <= 63 ? "Interruptor DR tetrapolar 63 A 30 mA" : null, "un", 1);
  add("dps", "DPS 275 V 20 kA", "DPS 275 V 20 kA", "un", dps);
  add("quadro", `Quadro de distribuição ${quadro} disjuntores`, quadro <= 6 ? "Quadro de distribuição embutir 4 a 6 disjuntores" : quadro <= 18 ? `Quadro de distribuição embutir ${quadro} disjuntores` : quadro <= 36 ? `Quadro de distribuição embutir ${quadro} disjuntores (com barramento)` : null, "un", 1);
  if (fases > 1 || circuitos.length > 6) add("barr", "Barramento pente bipolar/tripolar", "Barramento pente bipolar/tripolar", "un", 1);
  add("neutro", "Barramento de neutro ou terra", "Barramento de neutro ou terra", "un", 2);
  // sobra de 10% nos cabos, arredondada para cima
  for (const m of mat.values()) if (m.unidade === "m") m.qtd = Math.ceil(m.qtd * 1.1);
  if (!molhada) avisos.push("Nenhuma área molhada marcada: o DR 30 mA continua recomendado para tomadas (NBR 5410 5.1.3.2.2).");

  return {
    circuitos, potenciaInstalada: Math.round(circuitos.reduce((a, c) => a + c.carga.potenciaW, 0)),
    demandaIlumTug: Math.round(ilumTug * fIT), demandaTue: Math.round(tueVa * fT), demanda: Math.round(demanda), fatorIlumTug: fIT, fatorTue: fT,
    correnteDemanda: Math.round(correnteDemanda * 10) / 10, geral, polosGeral,
    dr: { polos: drPolos, corrente: drCorrente, motivo: molhada ? "obrigatório: há área molhada" : "recomendado" },
    dps, modulos, reserva, quadro, materiais: [...mat.values()].sort((a, b) => ordem(a.chave) - ordem(b.chave)), avisos,
  };
}
