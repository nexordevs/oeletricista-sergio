import { test } from "node:test";
import assert from "node:assert/strict";
import { planDays, reviewTasks, streak, fromKey, dayKey, addDays, parseHours, minutesByDay, type SubjectState } from "../src/lib/mentoria";

const subj = (id: string, weight: number, n: number): SubjectState => ({ id, name: id.toUpperCase(), weight, scheduled: 0, topics: Array.from({ length: n }, (_, i) => ({ id: `${id}${i}`, name: `T${i}`, studied: false, pending: false })) });
const cfg = { dayMinutes: [0, 180, 180, 180, 180, 180, 180], blockMinutes: 60, reviewDays: [1, 7, 15], simuladoEvery: 15, startDate: fromKey("2026-11-23"), examDate: null };

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
  const t = planDays({ ...cfg, dayMinutes: [0, 60, 60, 60, 60, 60, 60] }, [subj("pt", 1, 1)], fromKey("2026-11-23"), 3, new Set(["2026-11-23"]), new Set());
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

test("horas por dia: blocos proporcionais e dia com 0 h é descanso", () => {
  const t = planDays({ ...cfg, dayMinutes: [0, 90, 0, 240, 0, 0, 0] }, [subj("pt", 1, 20)], fromKey("2026-11-23"), 7, new Set(), new Set()).filter((x) => x.kind !== "SIMULADO");
  const seg = t.filter((x) => dayKey(x.date) === "2026-11-23"), qua = t.filter((x) => dayKey(x.date) === "2026-11-25");
  assert.deepEqual(seg.map((x) => x.minutes), [60, 30]);
  assert.equal(qua.length, 4);
  assert.equal(t.filter((x) => dayKey(x.date) === "2026-11-24").length, 0);
});

test("questões de matéria já vista trazem o tema", () => {
  const s = subj("pt", 1, 2); s.topics.forEach((x) => (x.studied = true));
  const t = planDays({ ...cfg, dayMinutes: [0, 120, 0, 0, 0, 0, 0] }, [s], fromKey("2026-11-23"), 1, new Set(), new Set());
  assert.ok(t.every((x) => x.kind === "QUESTOES" && x.topicId && x.title.includes("questões de T")));
});

test("lê as horas digitadas de vários jeitos", () => {
  assert.equal(parseHours("2"), 120); assert.equal(parseHours("1:30"), 90); assert.equal(parseHours("1h30"), 90);
  assert.equal(parseHours("1,5"), 90); assert.equal(parseHours("45min"), 45); assert.equal(parseHours(""), 0); assert.equal(parseHours("3h"), 180);
  assert.deepEqual(minutesByDay({ dayMinutes: null, dailyMinutes: 120, studyDays: "1,3" }), [0, 120, 0, 120, 0, 0, 0]);
});

import { parseEdital, videoLink, cleanYoutube } from "../src/lib/mentoria";
test("lê o conteúdo programático colado do edital", () => {
  const txt = `LÍNGUA PORTUGUESA: 1. Compreensão de textos. 2. Tipologia textual; Coesão e coerência; Figuras de linguagem.
RACIOCÍNIO LÓGICO
Proposições e conectivos;
Tabela-verdade.
NOÇÕES DE DIREITO PENAL MILITAR:
- Crime militar (art. 9º do CPM)`;
  const r = parseEdital(txt);
  assert.deepEqual(r.find((x) => x.subject === "Língua Portuguesa")?.topics, ["Compreensão de textos", "Tipologia textual", "Coesão e coerência", "Figuras de linguagem"]);
  assert.deepEqual(r.find((x) => x.subject === "Raciocínio Lógico")?.topics, ["Proposições e conectivos", "Tabela-verdade"]);
  assert.deepEqual(r.find((x) => x.subject === "Direito Penal Militar")?.topics, ["Crime militar (art. 9º do CPM)"]);
});

test("link de vídeo: o escolhido ou uma busca no YouTube; só aceita YouTube", () => {
  assert.ok(videoLink("Crase", "Língua Portuguesa").startsWith("https://www.youtube.com/results?search_query=Crase%20L%C3%ADngua"));
  assert.equal(videoLink("Crase", "LP", "https://youtu.be/abc"), "https://youtu.be/abc");
  assert.equal(cleanYoutube("https://www.youtube.com/watch?v=x1"), "https://www.youtube.com/watch?v=x1");
  assert.equal(cleanYoutube("https://evil.com/youtube.com"), null);
  assert.equal(cleanYoutube("javascript:alert(1)"), null);
});
