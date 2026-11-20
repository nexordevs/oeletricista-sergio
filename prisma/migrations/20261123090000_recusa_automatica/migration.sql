-- Orçamento sem resposta vira "Recusado" automaticamente (padrão: 7 dias)
ALTER TABLE "Quote" ADD COLUMN "autoRejected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Brand" ADD COLUMN "autoRejectDays" INTEGER NOT NULL DEFAULT 7;

-- Os que estavam como "Expirado" passam a "Recusado (automático)"
UPDATE "Quote" SET "status" = 'REJECTED', "autoRejected" = true, "decidedAt" = COALESCE("decidedAt", now()), "updatedAt" = now()
WHERE "status" = 'EXPIRED';
