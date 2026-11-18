import "server-only";
import { prisma } from "./db";
/** Marca como expirados os orçamentos enviados cuja validade passou. */
export async function expireQuotes(userId: string) {
  await prisma.$executeRaw`UPDATE "Quote" SET status = 'EXPIRED', "updatedAt" = now()
    WHERE "userId" = ${userId} AND status IN ('SENT','VIEWED') AND "issuedAt" IS NOT NULL
    AND "issuedAt" + make_interval(days => "validityDays") < now()`;
}
