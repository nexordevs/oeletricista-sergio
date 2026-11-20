import "server-only";
import { prisma } from "./db";
import type { Plan, User } from "@prisma/client";

export type Feature = "brandFull" | "clientHistory" | "status" | "whatsapp" | "finance" | "reports" | "courses";
export type Access = { active: boolean; plan: Plan | null; source: "subscription" | "manual" | "admin" | null; until: Date | null; quotesThisMonth: number; quoteLimit: number | null };

const featKey: Record<Feature, keyof Plan> = {
  brandFull: "featBrandFull", clientHistory: "featClientHistory", status: "featStatus",
  whatsapp: "featWhatsapp", finance: "featFinance", reports: "featReports", courses: "featCourses",
};

export function monthStart(d = new Date()) {
  // mês corrente no fuso de Brasília/Nordeste (UTC-3)
  const local = new Date(d.getTime() - 3 * 3600e3);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1, 3));
}

/** Fonte da verdade do controle de assinatura — sempre consultada no servidor. */
export async function getAccess(user: User): Promise<Access> {
  const quotesThisMonth = await prisma.quote.count({ where: { userId: user.id, createdAt: { gte: monthStart() } } });
  if (user.role === "ADMIN") {
    const plan = await prisma.plan.findFirst({ where: { active: true }, orderBy: { sortOrder: "desc" } });
    return { active: true, plan, source: "admin", until: null, quotesThisMonth, quoteLimit: null };
  }
  const now = new Date();
  if (user.manualAccessUntil && user.manualAccessUntil > now && user.manualPlanId) {
    const plan = await prisma.plan.findUnique({ where: { id: user.manualPlanId } });
    return { active: true, plan, source: "manual", until: user.manualAccessUntil, quotesThisMonth, quoteLimit: plan?.quoteLimit ?? null };
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId: user.id, status: { in: ["ACTIVE", "CANCELLED", "PAST_DUE"] }, currentPeriodEnd: { gt: now } },
    include: { plan: true }, orderBy: { createdAt: "desc" },
  });
  // Cancelada ou com pagamento atrasado: mantém acesso só até o fim do período já pago.
  if (sub) return { active: true, plan: sub.plan, source: "subscription", until: sub.currentPeriodEnd, quotesThisMonth, quoteLimit: sub.plan.quoteLimit };
  return { active: false, plan: null, source: null, until: null, quotesThisMonth, quoteLimit: null };
}

export function hasFeature(a: Access, f: Feature) {
  return Boolean(a.active && a.plan && a.plan[featKey[f]]);
}
export function canCreateQuote(a: Access) {
  return a.active && (a.quoteLimit == null || a.quotesThisMonth < a.quoteLimit);
}

export class AccessError extends Error {}
export async function assertFeature(user: User, f: Feature) {
  const a = await getAccess(user);
  if (!hasFeature(a, f)) throw new AccessError("Recurso não disponível no seu plano.");
  return a;
}
export async function assertActive(user: User) {
  const a = await getAccess(user);
  if (!a.active) throw new AccessError("Sua assinatura não está ativa.");
  return a;
}
