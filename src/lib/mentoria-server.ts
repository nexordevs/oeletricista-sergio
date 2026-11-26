import "server-only";
import { prisma } from "@/lib/db";
import { DEFAULT_SUBJECTS, todayBR, planDays, addDays, dayKey, parseList, minutesByDay, type SubjectState } from "@/lib/mentoria";

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


/** Monta o cronograma dos próximos dias (ciclo por peso + simulados), sem mexer nos dias que já têm tarefas. */
export async function buildSchedule(userId: string, days: number) {
  const u = { id: userId };
  const plan = await ensureSetup(u.id);
  const from = todayBR();
  const [subjects, counts, existing] = await Promise.all([
    prisma.studySubject.findMany({ where: { userId: u.id }, orderBy: { sortOrder: "asc" }, include: { topics: { orderBy: { sortOrder: "asc" } } } }),
    prisma.studyTask.groupBy({ by: ["subjectId"], where: { userId: u.id, kind: { in: ["TEORIA", "QUESTOES"] } }, _count: true }),
    prisma.studyTask.findMany({ where: { userId: u.id, date: { gte: from, lt: addDays(from, days) } }, select: { date: true, kind: true } }),
  ]);
  const pendingTopics = new Set((await prisma.studyTask.findMany({ where: { userId: u.id, kind: "TEORIA", status: "PENDENTE", topicId: { not: null } }, select: { topicId: true } })).map((t) => t.topicId));
  const state: SubjectState[] = subjects.map((s) => ({ id: s.id, name: s.name, weight: s.weight, scheduled: counts.find((c) => c.subjectId === s.id)?._count ?? 0,
    topics: s.topics.map((t) => ({ id: t.id, name: t.name, studied: Boolean(t.studiedAt), pending: pendingTopics.has(t.id) })) }));
  const busy = new Set(existing.filter((e) => e.kind === "TEORIA" || e.kind === "QUESTOES").map((e) => dayKey(e.date)));
  const sims = new Set(existing.filter((e) => e.kind === "SIMULADO").map((e) => dayKey(e.date)));
  const tasks = planDays({ dayMinutes: minutesByDay(plan), blockMinutes: plan.blockMinutes, reviewDays: parseList(plan.reviewDays), simuladoEvery: plan.simuladoEvery, startDate: plan.startDate, examDate: plan.examDate }, state, from, days, busy, sims);
  if (tasks.length) await prisma.studyTask.createMany({ data: tasks.map((t) => ({ ...t, userId: u.id, auto: true })) });
}
