import "server-only";
import { prisma } from "@/lib/db";
import { DEFAULT_SUBJECTS, todayBR } from "@/lib/mentoria";

/** Cria o plano e o conteúdo do edital na primeira vez. */
export async function ensureSetup(userId: string) {
  const plan = await prisma.studyPlan.findUnique({ where: { userId } });
  if (plan) return plan;
  await prisma.$transaction(async (tx) => {
    for (const [i, s] of DEFAULT_SUBJECTS.entries())
      await tx.studySubject.create({ data: { userId, name: s.name, weight: s.weight, sortOrder: i, topics: { create: s.topics.map((name, j) => ({ name, sortOrder: j })) } } });
    await tx.studyPlan.create({ data: { userId, startDate: todayBR() } });
  });
  return prisma.studyPlan.findUniqueOrThrow({ where: { userId } });
}

