// Uso: npm run import-prices   (atualiza a biblioteca de preços sugeridos)
import { PrismaClient } from "@prisma/client";
import { importPriceTable } from "../src/lib/price-import";
const prisma = new PrismaClient();
importPriceTable(prisma).then((r) => console.log(`Biblioteca atualizada: ${r.created} novos, ${r.updated} atualizados, ${r.deactivated} desativados.`)).finally(() => prisma.$disconnect());
