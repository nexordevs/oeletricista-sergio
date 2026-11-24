-- Divisão do valor do orçamento: ajudante e custo de material (visível só para o eletricista)
ALTER TABLE "Quote" ADD COLUMN "helperName" TEXT;
ALTER TABLE "Quote" ADD COLUMN "helperAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "materialCost" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "FinanceEntry" ADD COLUMN "autoKind" TEXT;
