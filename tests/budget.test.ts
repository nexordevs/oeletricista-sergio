import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, type CatInput } from "../src/lib/budget";

const cats: CatInput[] = [
  { id: "1", name: "Energia", group: "ESSENCIAL", planned: 200, spent: 250 },
  { id: "2", name: "Combustível", group: "ESSENCIAL", planned: 600, spent: 500 },
  { id: "3", name: "Lazer", group: "DESEJO", planned: 300, spent: 100 },
  { id: "4", name: "Reserva de emergência", group: "RESERVA", planned: 400, spent: 400 },
];

test("regra 50/30/20 sobre a renda do mês", () => {
  const a = analyze(4000, cats, 1200);
  assert.deepEqual(a.groups.map((g) => g.suggested), [2000, 1200, 800]);
  assert.equal(a.spent, 1250);
  assert.equal(a.leftover, 2750);
  assert.equal(a.groups.find((g) => g.group === "RESERVA")!.status, "abaixo"); // 400 < 800
});

test("reserva de emergência: 6x os essenciais e meses até a meta", () => {
  const a = analyze(4000, cats, 1200);
  assert.equal(a.reserve.goal, 4800); // (200 + 600) x 6
  assert.equal(a.reserve.months, 9); // faltam 3600 / 400 por mês
  assert.equal(a.reserve.pct, 25);
});

test("alertas: categoria estourada e gasto maior que a entrada", () => {
  const a = analyze(1000, cats, 0);
  assert.ok(a.alerts.some((x) => x.startsWith("Energia: passou R$ 50,00")));
  assert.ok(a.alerts.some((x) => x.includes("Saiu mais dinheiro do que entrou")));
});

test("sem renda não acusa 50/30/20", () => {
  const a = analyze(0, cats, 0);
  assert.ok(a.groups.every((g) => g.status === "ok"));
  assert.equal(a.spentPct, 0);
});

import { billStatus, goalPlan } from "../src/lib/budget";
const d = (s: string) => new Date(s + "T12:00:00Z");

test("conta fixa: paga, atrasada, vence hoje, vence logo e em dia", () => {
  assert.equal(billStatus(10, 2026, 11, true, d("2026-11-20")).kind, "paga");
  assert.equal(billStatus(10, 2026, 11, false, d("2026-11-20")).kind, "atrasada");
  assert.equal(billStatus(20, 2026, 11, false, d("2026-11-20")).kind, "vence-hoje");
  assert.equal(billStatus(23, 2026, 11, false, d("2026-11-20")).label, "Vence em 3 dias (23/11)");
  assert.equal(billStatus(28, 2026, 12, false, d("2026-11-20")).kind, "em-dia");
  assert.equal(billStatus(31, 2027, 2, false, d("2026-11-20")).due.getUTCDate(), 28); // fevereiro: último dia
});

test("meta: falta, % e quanto guardar por mês até o prazo", () => {
  const g = goalPlan(1500, 300, d("2027-04-15"), d("2026-11-20")); // nov..abr = 6 meses
  assert.equal(g.missing, 1200); assert.equal(g.pct, 20); assert.equal(g.monthsLeft, 6); assert.equal(g.perMonth, 200);
  assert.ok(goalPlan(1000, 1000, null, d("2026-11-20")).done);
  assert.ok(goalPlan(1000, 100, d("2026-10-01"), d("2026-11-20")).late);
});
