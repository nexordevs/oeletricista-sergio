import "server-only";
import { prisma } from "./db";
/**
 * Orçamento enviado/visualizado sem resposta por X dias (padrão 7, ajustável em Minha marca)
 * passa automaticamente para "Recusado". Se o cliente voltar, o eletricista duplica e envia um novo.
 */
export async function expireQuotes(userId: string) {
  await prisma.$executeRaw`UPDATE "Quote" SET status = 'REJECTED', "autoRejected" = true, "decidedAt" = now(), "updatedAt" = now()
    WHERE "userId" = ${userId} AND status IN ('SENT','VIEWED') AND "issuedAt" IS NOT NULL
    AND "issuedAt" + make_interval(days => COALESCE((SELECT "autoRejectDays" FROM "Brand" WHERE "userId" = ${userId}), 7)) < now()`;
}
