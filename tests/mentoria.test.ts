import { test } from "node:test";
import assert from "node:assert/strict";
import { planDays, reviewTasks, streak, fromKey, dayKey, addDays, type SubjectState } from "../src/lib/mentoria";

const subj = (id: string, weight: number, n: number): SubjectState => ({ id, name: id.toUpperCase(), weight, scheduled: 0, topics: Array.from({ length: n }, (_, i) => ({ id: `${id}${i}`, name: `T${i}`, studied: false, pending: false })) });
const cfg = { dailyMinutes: 180, blockMinutes: 60, studyDays: [1, 2, 3, 4, 5, 6], reviewDays: [1, 7, 15], simuladoEvery: 15, startDate: fromKey("2026-11-23"), examDate: null };

test("ciclo: 3 blocos por dia de estudo, sem domingo, matérias de maior peso aparecem mais", () => {
  const t = planDays(cfg, [subj("pt", 15, 20), subj("rl", 10, 20), subj("dh", 3, 20)], fromKey("2026-11-23"), 14, new Set(), new Set());
  const study = t.filter((x) => x.kind !== "SIMULADO");
  assert.equal(study.length, 12 * 3); // 12 dias úteis (seg-sáb) em 14 dias
  assert.ok(!study.some((x) => x.date.getUTCDay() === 0));
  const c = (id: string) => study.filter((x) => x.subjectId === id).length;
  assert.ok(c("pt") > c("rl") && c("rl") > c("dh"));
  assert.equal(new Set(study.map((x) => x.topicId)).size, study.length); // não repete assunto
});

test("dia já ocupado não recebe tarefas de novo; matéria vista vira questões", () => {
  const t = planDays({ ...cfg, dailyMinutes: 60 }, [subj("pt", 1, 1)], fromKey("2026-11-23"), 3, new Set(["2026-11-23"]), new Set());
  assert.equal(t[0].date.toISOString().slice(0, 10), "2026-11-24");
  assert.equal(t[0].kind, "TEORIA"); assert.equal(t[1].kind, "QUESTOES");
});

test("simulado a cada 15 dias desde o início", () => {
  const t = planDays(cfg, [subj("pt", 1, 50)], fromKey("2026-11-23"), 31, new Set(), new Set());
  assert.deepEqual(t.filter((x) => x.kind === "SIMULADO").map((x) => dayKey(x.date)), ["2026-12-08", "2026-12-23"]);
});

test("revisões em 1, 7 e 15 dias e sequência de estudo", () => {
  const r = reviewTasks(fromKey("2026-11-25"), [1, 7, 15], "pt", "pt0", "PT: Crase");
  assert.deepEqual(r.map((x) => dayKey(x.date)), ["2026-11-26", "2026-12-02", "2026-12-10"]);
  assert.equal(r[0].title, "Revisão 1 (1d): Crase");
  const today = fromKey("2026-11-25");
  assert.equal(streak(new Set([dayKey(today), dayKey(addDays(today, -1)), dayKey(addDays(today, -3))]), today), 2);
  assert.equal(streak(new Set([dayKey(addDays(today, -1))]), today), 1);
});
