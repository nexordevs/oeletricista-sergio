"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { canWatch } from "@/lib/aulas";

/** Marca/desmarca a aula como concluída — só se o usuário puder assistir ao curso. */
export async function toggleLesson(fd: FormData) {
  const user = await requireUser();
  const lessonId = String(fd.get("lessonId"));
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson || (!lesson.course.published && user.role !== "ADMIN")) return;
  const access = await getAccess(user);
  if (!canWatch(lesson.course.access, { isAdmin: user.role === "ADMIN", activePlan: access.active })) return;
  const key = { userId_lessonId: { userId: user.id, lessonId } };
  if (await prisma.lessonProgress.findUnique({ where: key })) await prisma.lessonProgress.delete({ where: key });
  else await prisma.lessonProgress.create({ data: { userId: user.id, lessonId } });
  revalidatePath(`/painel/aulas/${lesson.course.slug}`); revalidatePath("/painel/aulas");
  redirect(`/painel/aulas/${lesson.course.slug}?a=${lesson.id}`); // continua na mesma aula
}
