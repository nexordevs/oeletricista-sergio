// Concessionárias: sistema de tensão, norma de ligação em baixa tensão e categorias de atendimento.
// As categorias seguem os disjuntores padronizados de entrada; os LIMITES de carga instalada de cada
// categoria mudam de norma para norma (e de versão para versão) — o app sempre manda conferir a norma vigente.

export type SistemaTensao = "380/220" | "220/127";
export type Categoria = { fases: 1 | 2 | 3; disjuntor: number };
export type Concessionaria = { id: string; nome: string; uf: string; norma: string; sistema: SistemaTensao; site: string };

export const CONCESSIONARIAS: Concessionaria[] = [
  { id: "energisa-pb", nome: "Energisa Paraíba", uf: "PB", norma: "NDU 001 – Energisa", sistema: "380/220", site: "https://www.energisa.com.br" },
  { id: "neoenergia-pe", nome: "Neoenergia Pernambuco (antiga Celpe)", uf: "PE", norma: "DIS-NOR-030 – Neoenergia", sistema: "380/220", site: "https://www.neoenergia.com" },
  { id: "neoenergia-rn", nome: "Neoenergia Cosern", uf: "RN", norma: "DIS-NOR-030 – Neoenergia", sistema: "380/220", site: "https://www.neoenergia.com" },
  { id: "neoenergia-ba", nome: "Neoenergia Coelba", uf: "BA", norma: "DIS-NOR-030 – Neoenergia", sistema: "380/220", site: "https://www.neoenergia.com" },
  { id: "enel-ce", nome: "Enel Ceará", uf: "CE", norma: "Norma de fornecimento em BT – Enel CE", sistema: "380/220", site: "https://www.enel.com.br" },
  { id: "equatorial-al", nome: "Equatorial Alagoas", uf: "AL", norma: "Norma técnica de fornecimento em BT – Equatorial", sistema: "380/220", site: "https://www.equatorialenergia.com.br" },
  { id: "energisa-se", nome: "Energisa Sergipe", uf: "SE", norma: "NDU 001 – Energisa", sistema: "380/220", site: "https://www.energisa.com.br" },
  { id: "equatorial-pi", nome: "Equatorial Piauí", uf: "PI", norma: "Norma técnica de fornecimento em BT – Equatorial", sistema: "380/220", site: "https://www.equatorialenergia.com.br" },
  { id: "equatorial-ma", nome: "Equatorial Maranhão", uf: "MA", norma: "Norma técnica de fornecimento em BT – Equatorial", sistema: "380/220", site: "https://www.equatorialenergia.com.br" },
  { id: "enel-sp", nome: "Enel São Paulo", uf: "SP", norma: "Livro de Instruções Técnicas (LIG BT) – Enel SP", sistema: "220/127", site: "https://www.enel.com.br" },
  { id: "light-rj", nome: "Light", uf: "RJ", norma: "RECON BT – Light", sistema: "220/127", site: "https://www.light.com.br" },
  { id: "cemig-mg", nome: "Cemig", uf: "MG", norma: "ND-5.1 – Cemig", sistema: "220/127", site: "https://www.cemig.com.br" },
  { id: "outra-380", nome: "Outra concessionária (380/220 V)", uf: "", norma: "norma de ligação da concessionária", sistema: "380/220", site: "" },
  { id: "outra-127", nome: "Outra concessionária (220/127 V)", uf: "", norma: "norma de ligação da concessionária", sistema: "220/127", site: "" },
];
export const CONCESSIONARIA_PADRAO = "energisa-pb";
export const concessionaria = (id: string) => CONCESSIONARIAS.find((c) => c.id === id) ?? CONCESSIONARIAS[0];

/** Tensão fase-neutro do sistema. */
export const tensaoFN = (s: SistemaTensao) => (s === "380/220" ? 220 : 127);
export const tensaoFF = (s: SistemaTensao) => (s === "380/220" ? 380 : 220);

/** Disjuntores de entrada padronizados por tipo de ligação (escada de categorias). */
export const CATEGORIAS: Categoria[] = [
  ...[40, 50, 63].map((d) => ({ fases: 1 as const, disjuntor: d })),
  ...[40, 50, 63].map((d) => ({ fases: 2 as const, disjuntor: d })),
  ...[40, 50, 63, 80, 100, 125].map((d) => ({ fases: 3 as const, disjuntor: d })),
];
export const nomeLigacao = (f: 1 | 2 | 3, s: SistemaTensao) =>
  f === 1 ? `Monofásico ${tensaoFN(s)} V (F + N)` : f === 2 ? `Bifásico ${tensaoFF(s)}/${tensaoFN(s)} V (2F + N)` : `Trifásico ${tensaoFF(s)}/${tensaoFN(s)} V (3F + N)`;

/** Menor categoria do tipo de ligação que aguenta a corrente de demanda por fase. */
export function categoriaPara(fases: 1 | 2 | 3, correnteFase: number): Categoria | null {
  return CATEGORIAS.find((c) => c.fases === fases && c.disjuntor >= correnteFase) ?? null;
}
