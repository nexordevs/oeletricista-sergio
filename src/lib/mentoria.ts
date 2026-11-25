// Mentoria de estudos (PMPB – Soldado): conteúdo base, ciclo de estudos, revisões, simulados e indicadores.
// Base: prova objetiva PMPB 2023 (IBFC, 80 questões). Peso = nº aproximado de questões; confira sempre o edital vigente.

export const DEFAULT_SUBJECTS: { name: string; weight: number; topics: string[] }[] = [
  { name: "Língua Portuguesa", weight: 15, topics: ["Interpretação e compreensão de texto", "Ortografia e acentuação", "Classes de palavras", "Concordância verbal e nominal", "Regência e crase", "Pontuação", "Colocação pronominal", "Termos da oração (sintaxe)", "Período composto: coordenação e subordinação", "Semântica: sinônimos, antônimos e sentido das palavras"] },
  { name: "Raciocínio Lógico", weight: 10, topics: ["Proposições e conectivos", "Tabela-verdade, tautologia e equivalências", "Negação de proposições", "Lógica de argumentação", "Conjuntos", "Porcentagem, razão e proporção", "Análise combinatória", "Probabilidade", "Sequências lógicas"] },
  { name: "Geografia e História da Paraíba", weight: 10, topics: ["Colonização e formação da Paraíba", "Paraíba no Império", "Paraíba na República e Revolução de 1930", "Aspectos físicos: relevo, clima e hidrografia", "Mesorregiões e municípios", "Economia da Paraíba", "População e cultura paraibana"] },
  { name: "Língua Estrangeira (Inglês/Espanhol)", weight: 10, topics: ["Interpretação de texto", "Vocabulário e falsos cognatos", "Tempos verbais", "Pronomes, artigos e preposições"] },
  { name: "Noções de Informática", weight: 10, topics: ["Windows: arquivos e pastas", "Editor de texto (Word/Writer)", "Planilhas (Excel/Calc)", "Internet e navegadores", "Correio eletrônico", "Segurança da informação: vírus, backup e golpes", "Redes e nuvem: conceitos básicos"] },
  { name: "Direito Constitucional", weight: 6, topics: ["Princípios fundamentais", "Direitos e deveres individuais (art. 5º)", "Direitos sociais", "Nacionalidade e direitos políticos", "Organização do Estado", "Administração Pública (art. 37)", "Militares dos Estados (art. 42)", "Segurança Pública (art. 144)"] },
  { name: "Direito Penal", weight: 5, topics: ["Princípios e aplicação da lei penal", "Fato típico, ilicitude e culpabilidade", "Excludentes de ilicitude", "Concurso de pessoas", "Crimes contra a pessoa", "Crimes contra o patrimônio", "Crimes contra a Administração Pública"] },
  { name: "Direito Processual Penal", weight: 4, topics: ["Inquérito policial", "Ação penal", "Prisão em flagrante", "Prisão preventiva e temporária", "Provas, busca e apreensão"] },
  { name: "Direito Penal Militar", weight: 4, topics: ["Aplicação da lei penal militar", "Crime militar (art. 9º do CPM)", "Crimes contra a autoridade e a disciplina militar", "Crimes contra o serviço e o dever militar", "Estatuto e regulamento disciplinar da PMPB"] },
  { name: "Direitos Humanos", weight: 3, topics: ["Teoria geral dos direitos humanos", "Declaração Universal (1948)", "Pacto de São José da Costa Rica", "Direitos humanos e atividade policial: uso da força"] },
  { name: "Sociologia", weight: 3, topics: ["Sociedade, cultura e instituições", "Desigualdade social", "Violência e criminalidade", "Movimentos sociais e cidadania"] },
];

// ── Datas (fuso de Brasília; cada tarefa fica às 12:00 UTC do dia) ─────
export const todayBR = (now = new Date()) => { const d = new Date(now.getTime() - 3 * 3600e3); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12)); };
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
export const fromKey = (k: string) => new Date(k + "T12:00:00Z");
export const parseList = (s: string) => s.split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n >= 0);

export type PlanCfg = { dayMinutes: number[]; blockMinutes: number; reviewDays: number[]; simuladoEvery: number; startDate: Date; examDate: Date | null };
export const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Minutos de estudo de cada dia da semana (0 = descanso). Planos antigos: dailyMinutes nos dias de estudo. */
export function minutesByDay(p: { dayMinutes: string | null; dailyMinutes: number; studyDays: string }): number[] {
  if (p.dayMinutes) { const v = p.dayMinutes.split(",").map((x) => Math.max(0, Math.round(Number(x) || 0))); if (v.length === 7) return v; }
  const days = parseList(p.studyDays);
  return Array.from({ length: 7 }, (_, i) => (days.includes(i) ? p.dailyMinutes : 0));
}

/** Entende "2", "2h", "1:30", "1h30", "1,5", "90min" → minutos. Vazio ou inválido = 0. */
export function parseHours(v: string): number {
  const t = (v || "").trim().toLowerCase().replace(/\s/g, "");
  if (!t) return 0;
  let m = t.match(/^(\d{1,2})(?:h|:)(\d{1,2})?$/); if (m) return Number(m[1]) * 60 + Number(m[2] || 0);
  m = t.match(/^(\d{1,3})m(?:in)?$/); if (m) return Number(m[1]);
  const n = Number(t.replace(",", ".")); return Number.isFinite(n) && n >= 0 ? Math.round(n * 60) : 0;
}
export const fmtHours = (min: number) => (min <= 0 ? "—" : `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`);
export type SubjectState = { id: string; name: string; weight: number; scheduled: number; topics: { id: string; name: string; studied: boolean; pending: boolean }[] };
export type NewTask = { date: Date; kind: "TEORIA" | "QUESTOES" | "REVISAO" | "SIMULADO"; subjectId: string | null; topicId: string | null; title: string; minutes: number };

/**
 * Ciclo de estudos: cada bloco vai para a matéria mais "atrasada" em relação ao peso (menor tarefas/peso),
 * com o próximo assunto ainda não estudado. Quando a matéria já foi toda vista, o bloco vira bateria de questões.
 * busyDays: dias que já têm tarefas de estudo (não gera de novo). Não muda nada; só devolve as tarefas a criar.
 */
export function planDays(cfg: PlanCfg, subjects: SubjectState[], from: Date, days: number, busyDays: Set<string>, simuladoDays: Set<string>): NewTask[] {
  const out: NewTask[] = [];
  const subs = subjects.filter((s) => s.weight > 0).map((s) => ({ ...s, topics: s.topics.map((t) => ({ ...t })) }));
  const block = Math.max(15, cfg.blockMinutes);
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i), k = dayKey(d);
    // simulado a cada N dias desde o início (até a prova)
    const since = Math.round((d.getTime() - todayBR(cfg.startDate).getTime()) / 864e5);
    if (cfg.simuladoEvery > 0 && since > 0 && since % cfg.simuladoEvery === 0 && (!cfg.examDate || d <= cfg.examDate) && !simuladoDays.has(k))
      out.push({ date: d, kind: "SIMULADO", subjectId: null, topicId: null, title: "Simulado completo (80 questões, tempo de prova)", minutes: 240 });
    const dayMin = cfg.dayMinutes[d.getUTCDay()] ?? 0;
    if (dayMin <= 0 || busyDays.has(k) || subs.length === 0) continue;
    if (cfg.examDate && d > cfg.examDate) continue;
    // blocos cheios + um bloco menor com o que sobrar (se der 20 min ou mais)
    const sizes = Array.from({ length: Math.floor(dayMin / block) }, () => block);
    const rest = dayMin - sizes.length * block; if (rest >= 20 || sizes.length === 0) sizes.push(rest || dayMin);
    const blocks = sizes.length;
    const usedToday = new Set<string>();
    for (let b = 0; b < blocks; b++) {
      const pick = [...subs].filter((s) => !usedToday.has(s.id) || subs.length <= blocks)
        .sort((a, c) => a.scheduled / a.weight - c.scheduled / c.weight || c.weight - a.weight)[0];
      if (!pick) break;
      usedToday.add(pick.id); pick.scheduled++;
      const topic = pick.topics.find((t) => !t.studied && !t.pending);
      if (topic) { topic.pending = true; out.push({ date: d, kind: "TEORIA", subjectId: pick.id, topicId: topic.id, title: `${pick.name}: ${topic.name}`, minutes: sizes[b] }); }
      else {
        // matéria já vista: bateria de questões de um tema já estudado (gira entre os temas)
        const seen = pick.topics.filter((t) => t.studied);
        const t = seen.length ? seen[pick.scheduled % seen.length] : null;
        out.push({ date: d, kind: "QUESTOES", subjectId: pick.id, topicId: t?.id ?? null, title: `${pick.name}: questões${t ? ` de ${t.name}` : " (matéria toda)"}`, minutes: sizes[b] });
      }
    }
  }
  return out;
}

/** Revisões espaçadas depois de concluir a teoria de um assunto (ex.: 1, 7 e 15 dias). */
export function reviewTasks(done: Date, reviewDays: number[], subjectId: string, topicId: string, title: string): NewTask[] {
  return [...new Set(reviewDays.filter((n) => n > 0))].sort((a, b) => a - b).map((n, i) => ({
    date: addDays(done, n), kind: "REVISAO", subjectId, topicId, minutes: i === 0 ? 20 : 30, title: `Revisão ${i + 1} (${n}d): ${title.replace(/^[^:]+: /, "")}`,
  }));
}

/** Sequência de dias seguidos com pelo menos uma tarefa concluída (conta até hoje ou ontem). */
export function streak(doneDays: Set<string>, today: Date): number {
  let d = doneDays.has(dayKey(today)) ? today : addDays(today, -1), n = 0;
  while (doneDays.has(dayKey(d))) { n++; d = addDays(d, -1); }
  return n;
}

export const KIND_LABEL: Record<NewTask["kind"], string> = { TEORIA: "Teoria", QUESTOES: "Questões", REVISAO: "Revisão", SIMULADO: "Simulado" };
