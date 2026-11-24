// Controle de gastos: categorias padrão e fórmulas de economia (regra 50/30/20 e reserva de emergência).
export type Group = "ESSENCIAL" | "DESEJO" | "RESERVA";

export const GROUPS: Record<Group, { label: string; pct: number; hint: string }> = {
  ESSENCIAL: { label: "Essencial", pct: 50, hint: "Contas e custos do trabalho: energia, água, aluguel, combustível, ferramentas, MEI…" },
  DESEJO: { label: "Desejos", pct: 30, hint: "O que dá para cortar se apertar: lazer, compras, delivery…" },
  RESERVA: { label: "Guardar", pct: 20, hint: "Reserva de emergência e investimentos: pague-se primeiro!" },
};

export const DEFAULT_CATEGORIES: [string, Group][] = [
  ["Energia", "ESSENCIAL"], ["Água", "ESSENCIAL"], ["Aluguel / moradia", "ESSENCIAL"], ["Internet e celular", "ESSENCIAL"],
  ["Combustível / transporte", "ESSENCIAL"], ["Alimentação", "ESSENCIAL"], ["Ferramentas e equipamentos", "ESSENCIAL"], ["MEI / impostos", "ESSENCIAL"],
  ["Lazer", "DESEJO"], ["Compras pessoais", "DESEJO"],
  ["Reserva de emergência", "RESERVA"], ["Investimentos", "RESERVA"],
];

export type CatInput = { id: string; name: string; group: Group; planned: number; spent: number };
export type Analysis = {
  income: number; planned: number; spent: number; leftover: number; spentPct: number;
  groups: { group: Group; label: string; pct: number; suggested: number; planned: number; spent: number; status: "ok" | "acima" | "abaixo" }[];
  reserve: { goal: number; saved: number; monthly: number; months: number | null; pct: number };
  alerts: string[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * income: entradas do mês · cats: categorias com planejado e gasto do mês
 * reserveSaved: total já guardado (todos os meses) nas categorias do grupo "Guardar"
 */
export function analyze(income: number, cats: CatInput[], reserveSaved: number, otherSpent = 0): Analysis {
  const planned = cats.reduce((a, c) => a + c.planned, 0);
  const spent = cats.reduce((a, c) => a + c.spent, 0) + otherSpent;
  const groups = (Object.keys(GROUPS) as Group[]).map((g) => {
    const cs = cats.filter((c) => c.group === g);
    const p = cs.reduce((a, c) => a + c.planned, 0), s = cs.reduce((a, c) => a + c.spent, 0);
    const suggested = r2((income * GROUPS[g].pct) / 100);
    // essencial/desejo: ruim passar da sugestão · guardar: ruim ficar abaixo
    const base = Math.max(p, s);
    const status: "ok" | "acima" | "abaixo" = income <= 0 ? "ok" : g === "RESERVA" ? (base < suggested * 0.95 ? "abaixo" : "ok") : base > suggested * 1.05 ? "acima" : "ok";
    return { group: g, label: GROUPS[g].label, pct: GROUPS[g].pct, suggested, planned: r2(p), spent: r2(s), status };
  });

  // Reserva de emergência: 6 meses dos gastos essenciais (planejado; se vazio, o gasto do mês)
  const ess = groups.find((g) => g.group === "ESSENCIAL")!;
  const essMonthly = ess.planned > 0 ? ess.planned : ess.spent;
  const goal = r2(essMonthly * 6);
  const monthly = groups.find((g) => g.group === "RESERVA")!.planned;
  const missing = Math.max(0, goal - reserveSaved);
  const months = goal <= 0 ? null : missing === 0 ? 0 : monthly > 0 ? Math.ceil(missing / monthly) : null;

  const alerts: string[] = [];
  for (const c of cats) if (c.planned > 0 && c.spent > c.planned) alerts.push(`${c.name}: passou R$ ${(c.spent - c.planned).toFixed(2).replace(".", ",")} do planejado.`);
  if (income > 0 && spent > income) alerts.push(`Saiu mais dinheiro do que entrou este mês (R$ ${(spent - income).toFixed(2).replace(".", ",")} a mais).`);
  if (income > 0 && planned > income) alerts.push("O total planejado é maior que as entradas do mês: revise os valores.");
  const dg = groups.find((g) => g.group === "DESEJO")!;
  if (dg.status === "acima") alerts.push(`Desejos acima de 30% da renda: tente cortar R$ ${(Math.max(dg.planned, dg.spent) - dg.suggested).toFixed(2).replace(".", ",")}.`);
  if (groups.find((g) => g.group === "RESERVA")!.status === "abaixo") alerts.push("Você está guardando menos de 20% da renda. Separe a reserva logo que receber (pague-se primeiro).");

  return {
    income: r2(income), planned: r2(planned), spent: r2(spent), leftover: r2(income - spent), spentPct: income > 0 ? Math.round((spent / income) * 100) : 0,
    groups, reserve: { goal, saved: r2(reserveSaved), monthly: r2(monthly), months, pct: goal > 0 ? Math.min(100, Math.round((reserveSaved / goal) * 100)) : 0 }, alerts,
  };
}
