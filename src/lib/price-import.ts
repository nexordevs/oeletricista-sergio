import type { PrismaClient } from "@prisma/client";
import { PRICE_TABLE } from "../../prisma/price-table";
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
    const ex = await prisma.serviceTemplate.findFirst({ where: { name } });
    if (ex) { await prisma.serviceTemplate.update({ where: { id: ex.id }, data }); updated++; keep.push(ex.id); }
    else { keep.push((await prisma.serviceTemplate.create({ data })).id); created++; }
  }
  const off = await prisma.serviceTemplate.updateMany({ where: { id: { notIn: keep }, active: true }, data: { active: false } });
  return { created, updated, deactivated: off.count };
}
