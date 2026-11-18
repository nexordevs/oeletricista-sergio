import "server-only";
import { prisma } from "./db";
/** Orçamento acessível pelo link público (token aleatório). Rascunhos nunca são públicos. */
export async function publicQuote(token: string) {
  if (!/^[a-z0-9]{20,40}$/i.test(token)) return null;
  const quote = await prisma.quote.findUnique({ where: { shareToken: token }, include: { items: { orderBy: { position: "asc" } } } });
  if (!quote || quote.status === "DRAFT") return null;
  const brand = await prisma.brand.findUnique({ where: { userId: quote.userId } });
  if (!brand) return null;
  return { quote, brand };
}
