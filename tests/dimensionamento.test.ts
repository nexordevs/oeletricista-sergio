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

test("vários circuitos: demanda, geral, quadro e materiais", async () => {
  const { projetoCompleto } = await import("../src/lib/eletrica/dimensionamento");
  const c = (nome: string, w: number, tipo: "iluminacao" | "tomadas" | "dedicado", q: number, mol = false) => ({ nome, potenciaW: w, quantidade: q, comprimentoM: 10, tipo, areaMolhada: mol, fp: 1, sistema: "mono" as const, tensao: 220 });
  const p = projetoCompleto([c("Chuveiro", 7500, "dedicado", 1, true), c("Tomadas", 1200, "tomadas", 2), c("Iluminação", 1000, "iluminacao", 1)], { entrada: "mono", metodo: "B1", temperatura: 30, quedaMax: 4, agrupados: 1, distanciaEntradaM: 10 });
  assert.equal(p.circuitos.length, 4);
  assert.equal(p.potenciaInstalada, 10900);
  // ilum+TUG 3,4 kVA × 0,59 + chuveiro 7,5 kVA × 1
  assert.equal(p.demanda, Math.round(3400 * 0.59 + 7500));
  assert.ok(p.geral.disjuntor && p.geral.disjuntor >= p.correnteDemanda);
  assert.equal(p.dr.motivo.startsWith("obrigatório"), true);
  assert.equal(p.dps, 2);
  assert.ok(p.quadro >= p.modulos + p.reserva);
  const cabo6 = p.materiais.find((m) => m.chave === "cabo-6");
  assert.ok(cabo6 && cabo6.catalogo === "Cabo flexível 6 mm² 750 V", "chuveiro 7500 W em 6 mm²");
  assert.ok(p.materiais.some((m) => m.catalogo === "Disjuntor DIN unipolar 40 A"));
});

test("distância do fio sai do tamanho do imóvel", async () => {
  const { distanciaPorArea } = await import("../src/lib/eletrica/dimensionamento");
  assert.ok(distanciaPorArea(200, "tomadas") > distanciaPorArea(60, "tomadas"), "casa maior, mais fio");
  assert.ok(distanciaPorArea(100, "iluminacao") > distanciaPorArea(100, "dedicado"), "iluminação passa por mais pontos que o chuveiro");
  assert.equal(distanciaPorArea(100, "dedicado", "sobrado"), distanciaPorArea(100, "dedicado") + 3);
  assert.equal(distanciaPorArea(0, "tomadas"), 15);
});

test("materiais dizem onde usar e separam fase, neutro e terra", async () => {
  const { projetoCompleto } = await import("../src/lib/eletrica/dimensionamento");
  const c = (nome: string, w: number, tipo: "iluminacao" | "tomadas" | "dedicado", mol = false) => ({ nome, potenciaW: w, quantidade: 1, comprimentoM: 10, tipo, areaMolhada: mol, fp: 1, sistema: "mono" as const, tensao: 220 });
  const p = projetoCompleto([c("Chuveiro", 7500, "dedicado", true), c("Tomadas", 1200, "tomadas")], { entrada: "mono", metodo: "B1", temperatura: 30, quedaMax: 4, agrupados: 1, distanciaEntradaM: 10 });
  const c6 = p.materiais.find((m) => m.chave === "cabo-6")!;
  assert.equal(c6.uso, "Chuveiro · Entrada: medidor → quadro");
  assert.match(c6.detalhe!, /fase 22 m.*neutro 22 m.*terra 22 m/);
  assert.equal(c6.qtd, 66);
  assert.ok(p.materiais.every((m) => m.uso.length > 0), "todo material tem onde usar");
  assert.match(p.materiais.find((m) => m.chave === "dr")!.uso, /Chuveiro/);
});

test("tamanho digitado: área ou medidas, e a casa montada por ele", async () => {
  const { parseTamanho, montarCasa, comodosPorArea, distanciaPorArea, PRESETS } = await import("../src/lib/eletrica/dimensionamento");
  assert.deepEqual(parseTamanho("10x20"), { area: 200, lado: 15, frente: 10, fundo: 20 });
  assert.equal(parseTamanho("10,5 X 20 m")!.area, 210);
  assert.equal(parseTamanho("120 m²")!.area, 120);
  assert.equal(parseTamanho("abc"), null);
  assert.ok(distanciaPorArea(200, "tomadas", "terrea", 15) > distanciaPorArea(200, "tomadas"), "terreno comprido anda mais fio que quadrado");
  for (const area of [40, 75, 120, 200, 300]) for (const imovel of ["terrea", "apartamento", "sobrado"] as const) {
    const c = { ...comodosPorArea(area, imovel), copas: 1, escritorios: 1, gourmet: 1, garagens: 1, piscina: true, arSala: true }, lista = montarCasa(c, area, imovel);
    for (const x of lista) assert.ok(PRESETS.some((p) => p.nome.startsWith(x.nome)), `${x.nome} existe na lista`);
    assert.equal(lista.find((x) => x.nome.startsWith("Chuveiro"))!.qtd, c.banheiros + c.suites);
  }
  const q = (a: number) => comodosPorArea(a).quartos + comodosPorArea(a).suites;
  assert.ok(q(200) > q(60));
  // casa do jeito que está: 2 quartos, 1 banheiro, sala, cozinha, serviço, sem ar
  const casa = { ...comodosPorArea(60), quartos: 2, suites: 0, banheiros: 1, salas: 1, arQuartos: false, arSala: false };
  const l = montarCasa(casa, 60, "terrea");
  assert.ok(!l.some((x) => x.nome.startsWith("Split")));
  assert.equal(l.find((x) => x.nome === "Chuveiro 7.500 W")!.qtd, 1);
  assert.equal(l.find((x) => x.nome === "Tomadas de sala/quartos")!.qtd, 1, "2 quartos + sala + banheiro cabem num circuito");
  assert.ok(!l.some((x) => x.nome === "Micro-ondas"), "micro-ondas entra nas tomadas da cozinha");
  assert.equal(l.filter((x) => x.nome.startsWith("Iluminação")).reduce((a, x) => a + x.qtd, 0), 1, "iluminação interna e externa juntas");
  assert.ok(l.reduce((a, x) => a + x.qtd, 0) <= 9, "casa de 60 m² sem ar: poucos circuitos");
});

test("concessionária: categoria de entrada e tensão do sistema", async () => {
  const { projetoCompleto } = await import("../src/lib/eletrica/dimensionamento");
  const { categoriaPara, CONCESSIONARIAS } = await import("../src/lib/eletrica/concessionarias");
  assert.equal(categoriaPara(1, 38)!.disjuntor, 40);
  assert.equal(categoriaPara(1, 64), null, "monofásico acima de 63 A não existe: sobe para bi/tri");
  assert.equal(categoriaPara(3, 70)!.disjuntor, 80);
  assert.ok(CONCESSIONARIAS.some((c) => c.id === "energisa-pb" && c.sistema === "380/220"));
  assert.ok(CONCESSIONARIAS.some((c) => c.id === "neoenergia-pe" && c.sistema === "380/220"));
  const casa = [{ nome: "Chuveiro", potenciaW: 7500, quantidade: 1, comprimentoM: 12, tipo: "dedicado" as const, areaMolhada: true, fp: 1, sistema: "mono" as const, tensao: 220 },
    { nome: "Tomadas", potenciaW: 1200, quantidade: 2, comprimentoM: 15, tipo: "tomadas" as const, areaMolhada: false, fp: 1, sistema: "mono" as const, tensao: 220 }];
  const cfg = { entrada: "mono" as const, metodo: "B1" as const, temperatura: 30, quedaMax: 4, agrupados: 1, distanciaEntradaM: 10 };
  const pb = projetoCompleto(casa, { ...cfg, concessionaria: "energisa-pb" });
  assert.match(pb.categoria!, /Monofásico 220 V/); assert.equal(pb.geral.disjuntor, Number(pb.categoria!.match(/(\d+) A$/)![1]));
  assert.match(pb.avisos.join(" "), /NDU 001/);
  const pe = projetoCompleto(casa, { ...cfg, concessionaria: "neoenergia-pe" });
  assert.match(pe.avisos.join(" "), /DIS-NOR-030/);
  // sistema 220/127: chuveiro de 220 V vai entre fases (bipolar) e pede entrada bifásica
  const sp = projetoCompleto(casa, { ...cfg, entrada: "bi", concessionaria: "enel-sp" });
  const ch = sp.circuitos.find((c) => c.carga.nome === "Chuveiro")!, tm = sp.circuitos.find((c) => c.carga.nome === "Tomadas")!;
  assert.equal(ch.polos, 2); assert.equal(tm.carga.tensao, 127);
  assert.match(projetoCompleto(casa, { ...cfg, concessionaria: "enel-sp" }).avisos.join(" "), /entrada precisa ser bifásica/);
});
