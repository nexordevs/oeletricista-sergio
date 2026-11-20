import { test } from "node:test";
import assert from "node:assert/strict";
import { dimensionar, PRESETS, type Entrada } from "../src/lib/eletrica/dimensionamento";

const base: Entrada = { potenciaW: 7500, tensao: 220, sistema: "mono", fp: 1, comprimentoM: 10, metodo: "B1", temperatura: 30, circuitosAgrupados: 1, quedaMax: 4, tipo: "dedicado", areaMolhada: true };

test("chuveiro 7.500 W em 220 V: 34 A → disjuntor 40 A e fio 6 mm²", () => {
  const r = dimensionar(base);
  assert.equal(r.ib, 34.1); assert.equal(r.disjuntor, 40); assert.equal(r.secao, 6); assert.equal(r.terra, 6);
  assert.equal(r.dr, "obrigatorio"); assert.ok(r.quedaPct! < 4);
});
test("chuveiro 5.500 W em 127 V: 43 A → disjuntor 50 A e fio 10 mm²", () => {
  const r = dimensionar({ ...base, potenciaW: 5500, tensao: 127 });
  assert.equal(r.disjuntor, 50); assert.equal(r.secao, 10);
});
test("circuito longo: a queda de tensão aumenta a bitola", () => {
  assert.equal(dimensionar({ ...base, comprimentoM: 40 }).secao, 6);
  const r = dimensionar({ ...base, comprimentoM: 50 });
  assert.equal(r.secao, 10); assert.equal(r.motivoSecao, "queda de tensão");
});
test("3 circuitos no mesmo eletroduto: fator 0,70 exige 16 mm² para 40 A", () => {
  const r = dimensionar({ ...base, circuitosAgrupados: 3 });
  assert.equal(r.fatorAgrup, 0.7); assert.equal(r.secao, 16);
});
test("temperatura de 40 °C reduz a capacidade (fator 0,87)", () => {
  const r = dimensionar({ ...base, temperatura: 40 });
  assert.equal(r.fatorTemp, 0.87); assert.equal(r.secao, 10); // 41 × 0,87 = 35,7 A < 40 A
});
test("iluminação respeita a seção mínima de 1,5 mm²; tomadas, 2,5 mm²", () => {
  assert.equal(dimensionar({ ...base, potenciaW: 1000, tensao: 127, tipo: "iluminacao", areaMolhada: false }).secao, 1.5);
  assert.equal(dimensionar({ ...base, potenciaW: 600, tensao: 127, tipo: "tomadas", areaMolhada: false }).secao, 2.5);
});
test("trifásico 10 kW 380 V FP 0,85: 17,9 A → 20 A e 2,5 mm² (3 condutores carregados)", () => {
  const r = dimensionar({ ...base, potenciaW: 10000, tensao: 380, sistema: "tri", fp: 0.85, tipo: "motor", areaMolhada: false });
  assert.equal(r.ib, 17.9); assert.equal(r.disjuntor, 20); assert.equal(r.secao, 2.5); assert.equal(r.curva, "C");
});
test("terra conforme Tabela 58: até 16 mm² igual à fase; 25–35 mm² → 16 mm²; acima → metade", () => {
  const a = dimensionar({ ...base, potenciaW: 20000 }); // 90,9 A → 100 A → 25 mm²
  assert.equal(a.secao, 25); assert.equal(a.terra, 16);
  const b = dimensionar({ ...base, potenciaW: 26000, circuitosAgrupados: 2 }); // 118 A → 125 A; fator 0,8 → 70 mm²
  assert.equal(b.secao, 70); assert.equal(b.terra, 35);
});

test("todos os aparelhos da lista geram um dimensionamento válido (220 V ou o sistema do aparelho, 15 m)", () => {
  assert.ok(PRESETS.length >= 60, `lista com ${PRESETS.length} itens`);
  for (const p of PRESETS) {
    const r = dimensionar({ ...base, potenciaW: p.w, fp: p.fp, tipo: p.tipo, areaMolhada: Boolean(p.molhada), sistema: p.sistema ?? "mono", tensao: p.tensao ?? 220, comprimentoM: 15 });
    assert.ok(r.disjuntor && r.secao && r.secao >= r.minimoNorma, `${p.nome}: ${JSON.stringify(r)}`);
    assert.ok(r.disjuntor! >= r.ib && r.iz! >= r.disjuntor!, `${p.nome}: Ib ≤ In ≤ Iz`);
  }
});
