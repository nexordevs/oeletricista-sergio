"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
export async function dismissOnboarding() {
  const u = await requireUser();
  await prisma.user.update({ where: { id: u.id }, data: { onboardedAt: new Date() } });
  revalidatePath("/painel");
}
