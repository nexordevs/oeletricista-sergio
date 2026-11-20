-- Lançamento automático no financeiro quando o orçamento é aprovado
ALTER TABLE "FinanceEntry" ADD COLUMN "auto" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "FinanceEntry_quoteId_idx" ON "FinanceEntry"("quoteId");

-- Orçamentos já aprovados e ainda sem lançamento entram com a data da aprovação
INSERT INTO "FinanceEntry" ("id", "userId", "type", "description", "amount", "date", "quoteId", "auto", "createdAt")
SELECT 'auto_' || q."id", q."userId", 'INCOME',
       'Orçamento nº ' || LPAD(q."number"::text, 3, '0') || ' aprovado – ' || q."clientName",
       q."total", COALESCE(q."decidedAt", q."updatedAt"), q."id", true, now()
FROM "Quote" q
WHERE q."status" = 'APPROVED' AND q."total" > 0
  AND NOT EXISTS (SELECT 1 FROM "FinanceEntry" f WHERE f."quoteId" = q."id");
