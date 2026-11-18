import "server-only";
import { prisma } from "./db";
import { monthStart } from "./access";
export async function adminMetrics() {
  const now = new Date(), d30 = new Date(Date.now() - 30 * 864e5), ms = monthStart();
  const [users, newUsers, activeSubs, pastDue, cancelled30, paidThisMonth, payingUsers, manual, leadsNew] = await Promise.all([
    prisma.user.count({ where: { role: "ELECTRICIAN" } }),
    prisma.user.count({ where: { role: "ELECTRICIAN", createdAt: { gte: d30 } } }),
    prisma.subscription.findMany({ where: { status: "ACTIVE", currentPeriodEnd: { gt: now } }, select: { amount: true, cycle: true, userId: true } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.subscription.count({ where: { cancelledAt: { gte: d30 } } }),
    prisma.payment.aggregate({ where: { status: { in: ["approved", "manual"] }, paidAt: { gte: ms } }, _sum: { amount: true } }),
    prisma.payment.findMany({ where: { status: "approved" }, distinct: ["userId"], select: { userId: true } }),
    prisma.user.count({ where: { manualAccessUntil: { gt: now } } }),
    prisma.leadRequest.count({ where: { status: "NEW" } }),
  ]);
  const mrr = activeSubs.reduce((a, s) => a + Number(s.amount) / (s.cycle === "YEARLY" ? 12 : 1), 0);
  return {
    users, newUsers, active: new Set(activeSubs.map((s) => s.userId)).size, pastDue, cancelled30, manual, leadsNew,
    revenueMonth: Number(paidThisMonth._sum.amount ?? 0), mrr, conversion: users ? (payingUsers.length / users) * 100 : 0,
  };
}
