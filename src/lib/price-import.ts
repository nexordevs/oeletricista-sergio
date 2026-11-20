import type { PrismaClient } from "@prisma/client";
import { PRICE_TABLE } from "../../prisma/price-table";
import { MATERIAL_TABLE } from "../../prisma/material-table";
/**
 * Atualiza a BIBLIOTECA de preços sugeridos com a tabela oficial.
 * Não altera a tabela pessoal (UserService) de nenhum eletricista.
 * Serviços antigos da biblioteca que não estão na tabela são desativados (não aparecem para novos usuários).
 */
export async function importPriceTable(prisma: PrismaClient) {
  let created = 0, updated = 0;
  const keep: string[] = [];
  for (const [category, name, unit, min, max, avg] of PRICE_TABLE) {
    const data = { name, category, unit, minPrice: min, maxPrice: max, suggestedPrice: avg, active: true };
    const ex = await prisma.serviceTemplate.findFirst({ where: { name, kind: "SERVICE" } });
    if (ex) { await prisma.serviceTemplate.update({ where: { id: ex.id }, data }); updated++; keep.push(ex.id); }
    else { keep.push((await prisma.serviceTemplate.create({ data })).id); created++; }
  }
  const off = await prisma.serviceTemplate.updateMany({ where: { id: { notIn: keep }, active: true, kind: "SERVICE" }, data: { active: false } });
  return { created, updated, deactivated: off.count };
}

/** Atualiza a biblioteca de MATERIAIS (preço de referência de loja). Não altera a tabela pessoal de ninguém. */
export async function importMaterialTable(prisma: PrismaClient) {
  let created = 0, updated = 0;
  const keep: string[] = [];
  for (const [category, name, unit, price] of MATERIAL_TABLE) {
    const data = { name, category, unit, suggestedPrice: price, minPrice: null, maxPrice: null, kind: "MATERIAL" as const, active: true };
    const ex = await prisma.serviceTemplate.findFirst({ where: { name, kind: "MATERIAL" } });
    if (ex) { await prisma.serviceTemplate.update({ where: { id: ex.id }, data }); updated++; keep.push(ex.id); }
    else { keep.push((await prisma.serviceTemplate.create({ data })).id); created++; }
  }
  const off = await prisma.serviceTemplate.updateMany({ where: { id: { notIn: keep }, active: true, kind: "MATERIAL" }, data: { active: false } });
  return { created, updated, deactivated: off.count };
}
