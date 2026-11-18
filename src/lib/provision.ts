import { prisma } from "./db";
/** Copia a biblioteca da administração para a tabela individual do eletricista (sem sobrescrever o que já existe). */
export async function provisionServices(userId: string) {
  const templates = await prisma.serviceTemplate.findMany({ where: { active: true } });
  const existing = new Set((await prisma.userService.findMany({ where: { userId, templateId: { not: null } }, select: { templateId: true } })).map((s) => s.templateId));
  const toCreate = templates.filter((t) => !existing.has(t.id));
  if (toCreate.length)
    await prisma.userService.createMany({
      data: toCreate.map((t) => ({ userId, templateId: t.id, name: t.name, description: t.description, unit: t.unit, price: t.suggestedPrice, category: t.category })),
      skipDuplicates: true,
    });
  return toCreate.length;
}
