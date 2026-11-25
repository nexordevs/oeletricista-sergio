"use server";
// Mentoria de estudos — exclusiva do administrador (requireAdmin em todas as ações).
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseForm, zText, type ActionState } from "@/lib/form";
import { ensureSetup } from "@/lib/mentoria-server";
import { planDays, reviewTasks, todayBR, addDays, dayKey, fromKey, parseList, type SubjectState } from "@/lib/mentoria";

const refresh = () => revalidatePath("/admin/mentoria");

export async function savePlan(_: ActionState, fd: FormData): Promise<ActionState> {
  const u = await requireAdmin();
  const p = parseForm(z.object({
    title: zText(2, 60, "Dê um nome ao plano"),
    examDate: z.string().optional(),
    dailyMinutes: z.coerce.number().int().min(30, "Mínimo 30 min").max(960, "Máximo 16 h"),
    blockMinutes: z.coerce.number().int().min(15, "Mínimo 15 min").max(240, "Máximo 4 h"),
    weeklyQuestions: z.coerce.number().int().min(0).max(5000),
    reviewDays: z.string().regex(/^\s*\d+(\s*,\s*\d+)*\s*$/, "Ex.: 1, 7, 15"),
    simuladoEvery: z.coerce.number().int().min(0).max(90),
  }), fd);
  if (!p.ok) return p.error;
  const studyDays = fd.getAll("studyDays").map(Number).filter((n) => n >= 0 && n <= 6);
  if (!studyDays.length) return { error: "Escolha pelo menos um dia de estudo.", fields: { studyDays: "Escolha os dias" } };
  const { examDate, reviewDays, ...d } = p.data;
  await ensureSetup(u.id);
  await prisma.studyPlan.update({ where: { userId: u.id }, data: { ...d, studyDays: studyDays.join(","), reviewDays: parseList(reviewDays).join(","), examDate: examDate && /^\d{4}-\d{2}-\d{2}$/.test(examDate) ? fromKey(examDate) : null } });
  refresh();
  return { ok: true, message: "Plano salvo!" };
}

/** Monta o cronograma dos próximos dias (ciclo por peso + simulados), sem mexer nos dias que já têm tarefas. */
export async function generateSchedule(fd: FormData) {
  const u = await requireAdmin();
  const plan = await ensureSetup(u.id);
  const days = Math.min(30, Math.max(1, Number(fd.get("days")) || 7));
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
  const tasks = planDays({ dailyMinutes: plan.dailyMinutes, blockMinutes: plan.blockMinutes, studyDays: parseList(plan.studyDays), reviewDays: parseList(plan.reviewDays), simuladoEvery: plan.simuladoEvery, startDate: plan.startDate, examDate: plan.examDate }, state, from, days, busy, sims);
  if (tasks.length) await prisma.studyTask.createMany({ data: tasks.map((t) => ({ ...t, userId: u.id })) });
  refresh();
}

/** Marca como feito (com questões/acertos opcionais). Teoria concluída agenda as revisões. */
export async function completeTask(_: ActionState, fd: FormData): Promise<ActionState> {
  const u = await requireAdmin();
  const p = parseForm(z.object({ id: z.string().min(1), questions: z.string().optional(), correct: z.string().optional() }), fd);
  if (!p.ok) return p.error;
  const num = (v?: string) => (v && v.trim() ? Math.max(0, Math.round(Number(v.replace(",", ".")))) : null);
  const questions = num(p.data.questions), correct = num(p.data.correct);
  if (questions != null && correct != null && correct > questions) return { error: "Acertos não podem passar do total de questões." };
  const t = await prisma.studyTask.findFirst({ where: { id: p.data.id, userId: u.id } });
  if (!t) return { error: "Tarefa não encontrada." };
  const plan = await ensureSetup(u.id);
  const today = todayBR();
  await prisma.$transaction(async (tx) => {
    await tx.studyTask.update({ where: { id: t.id }, data: { status: "FEITO", doneAt: new Date(), questions, correct } });
    if (t.kind === "TEORIA" && t.topicId && t.subjectId) {
      await tx.studyTopic.update({ where: { id: t.topicId }, data: { studiedAt: new Date() } });
      const has = await tx.studyTask.count({ where: { userId: u.id, topicId: t.topicId, kind: "REVISAO" } });
      if (!has) await tx.studyTask.createMany({ data: reviewTasks(today, parseList(plan.reviewDays), t.subjectId, t.topicId, t.title).map((r) => ({ ...r, userId: u.id })) });
    }
  });
  refresh();
  return { ok: true, message: t.kind === "TEORIA" && t.topicId ? "Feito! Revisões agendadas ✓" : "Feito! ✓" };
}

export async function undoTask(fd: FormData) {
  const u = await requireAdmin();
  await prisma.studyTask.updateMany({ where: { id: String(fd.get("id")), userId: u.id }, data: { status: "PENDENTE", doneAt: null } });
  refresh();
}

/** Não estudou? Reprograma para hoje, amanhã ou outra data. */
export async function rescheduleTask(fd: FormData) {
  const u = await requireAdmin();
  const t = await prisma.studyTask.findFirst({ where: { id: String(fd.get("id")), userId: u.id, status: "PENDENTE" } });
  if (!t) return;
  const to = String(fd.get("to") || "amanha");
  const date = to === "hoje" ? todayBR() : to === "amanha" ? addDays(todayBR(), 1) : /^\d{4}-\d{2}-\d{2}$/.test(to) ? fromKey(to) : null;
  if (!date) return;
  await prisma.studyTask.update({ where: { id: t.id }, data: { date, originalDate: t.originalDate ?? t.date, rescheduledCount: { increment: 1 } } });
  refresh();
}

/** Atrasadas: tudo para hoje, ou espalhar (2 por dia) nos próximos dias de estudo. */
export async function rescheduleLate(fd: FormData) {
  const u = await requireAdmin();
  const plan = await ensureSetup(u.id);
  const today = todayBR();
  const late = await prisma.studyTask.findMany({ where: { userId: u.id, status: "PENDENTE", date: { lt: today } }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
  const mode = String(fd.get("mode") || "espalhar");
  const days = parseList(plan.studyDays);
  let d = mode === "hoje" ? today : addDays(today, 1), n = 0;
  for (const t of late) {
    if (mode !== "hoje") { while (!days.includes(d.getUTCDay())) d = addDays(d, 1); if (n === 2) { d = addDays(d, 1); n = 0; while (!days.includes(d.getUTCDay())) d = addDays(d, 1); } n++; }
    await prisma.studyTask.update({ where: { id: t.id }, data: { date: d, originalDate: t.originalDate ?? t.date, rescheduledCount: { increment: 1 } } });
  }
  refresh();
}

export async function addTask(_: ActionState, fd: FormData): Promise<ActionState> {
  const u = await requireAdmin();
  const p = parseForm(z.object({ title: zText(2, 150, "Descreva a tarefa"), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"), kind: z.enum(["TEORIA", "QUESTOES", "REVISAO", "SIMULADO"]), minutes: z.coerce.number().int().min(5).max(600), subjectId: z.string().optional() }), fd);
  if (!p.ok) return p.error;
  const { subjectId, date, ...d } = p.data;
  const s = subjectId ? await prisma.studySubject.findFirst({ where: { id: subjectId, userId: u.id }, select: { id: true } }) : null;
  await prisma.studyTask.create({ data: { ...d, date: fromKey(date), subjectId: s?.id ?? null, userId: u.id } });
  refresh();
  return { ok: true, message: "Tarefa adicionada!" };
}

export async function deleteTask(fd: FormData) {
  const u = await requireAdmin();
  await prisma.studyTask.deleteMany({ where: { id: String(fd.get("id")), userId: u.id } });
  refresh();
}

// ── Matérias e assuntos ───────────────────────────────────────────────
export async function saveSubject(_: ActionState, fd: FormData): Promise<ActionState> {
  const u = await requireAdmin();
  const p = parseForm(z.object({ id: z.string().optional(), name: zText(2, 80, "Nome da matéria"), weight: z.coerce.number().int().min(0, "0 a 50").max(50, "0 a 50") }), fd);
  if (!p.ok) return p.error;
  const { id, ...d } = p.data;
  if (id) await prisma.studySubject.updateMany({ where: { id, userId: u.id }, data: d });
  else await prisma.studySubject.create({ data: { ...d, userId: u.id, sortOrder: 99 } });
  refresh();
  return { ok: true, message: "Salvo" };
}

export async function deleteSubject(fd: FormData) {
  const u = await requireAdmin();
  await prisma.studySubject.deleteMany({ where: { id: String(fd.get("id")), userId: u.id } });
  refresh();
}

export async function addTopic(_: ActionState, fd: FormData): Promise<ActionState> {
  const u = await requireAdmin();
  const p = parseForm(z.object({ subjectId: z.string().min(1), name: zText(2, 120, "Nome do assunto") }), fd);
  if (!p.ok) return p.error;
  const s = await prisma.studySubject.findFirst({ where: { id: p.data.subjectId, userId: u.id }, select: { id: true } });
  if (!s) return { error: "Matéria não encontrada." };
  await prisma.studyTopic.create({ data: { subjectId: s.id, name: p.data.name, sortOrder: 99 } });
  refresh();
  return { ok: true, message: "Assunto adicionado" };
}

export async function toggleTopic(fd: FormData) {
  const u = await requireAdmin();
  const t = await prisma.studyTopic.findFirst({ where: { id: String(fd.get("id")), subject: { userId: u.id } } });
  if (t) await prisma.studyTopic.update({ where: { id: t.id }, data: { studiedAt: t.studiedAt ? null : new Date() } });
  refresh();
}

export async function deleteTopic(fd: FormData) {
  const u = await requireAdmin();
  await prisma.studyTopic.deleteMany({ where: { id: String(fd.get("id")), subject: { userId: u.id } } });
  refresh();
}

// ── Questões resolvidas (lançamento) ─────────────────────────────────
export async function addQuestionLog(_: ActionState, fd: FormData): Promise<ActionState> {
  const u = await requireAdmin();
  const p = parseForm(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    subjectId: z.string().min(1, "Escolha a matéria"),
    topicId: z.string().optional(),
    questions: z.coerce.number().int().min(1, "Quantas questões?").max(1000, "Máximo 1000"),
    correct: z.coerce.number().int().min(0, "Acertos").max(1000, "Máximo 1000"),
    minutes: z.string().optional(),
    source: z.string().max(60).optional(),
    note: z.string().max(200).optional(),
  }), fd);
  if (!p.ok) return p.error;
  const d = p.data;
  if (d.correct > d.questions) return { error: "Confira os campos.", fields: { correct: "Acertos não podem passar das questões feitas" } };
  const s = await prisma.studySubject.findFirst({ where: { id: d.subjectId, userId: u.id }, include: { topics: { select: { id: true } } } });
  if (!s) return { error: "Confira os campos.", fields: { subjectId: "Matéria não encontrada" } };
  const topicId = d.topicId && s.topics.some((t) => t.id === d.topicId) ? d.topicId : null;
  const min = d.minutes && d.minutes.trim() ? Math.max(0, Math.min(600, Math.round(Number(d.minutes)))) : null;
  await prisma.studyQuestionLog.create({ data: { userId: u.id, date: fromKey(d.date), subjectId: s.id, topicId, questions: d.questions, correct: d.correct, minutes: Number.isFinite(min) ? min : null, source: d.source?.trim() || null, note: d.note?.trim() || null } });
  revalidatePath("/admin/mentoria"); revalidatePath("/admin/mentoria/questoes");
  const pct = Math.round((d.correct / d.questions) * 100);
  return { ok: true, message: `${d.questions} questões de ${s.name} lançadas · ${pct}% de acerto${pct >= 70 ? " 🔥" : pct < 40 ? " — revise esse conteúdo" : ""}` };
}

export async function deleteQuestionLog(fd: FormData) {
  const u = await requireAdmin();
  await prisma.studyQuestionLog.deleteMany({ where: { id: String(fd.get("id")), userId: u.id } });
  revalidatePath("/admin/mentoria"); revalidatePath("/admin/mentoria/questoes");
}
