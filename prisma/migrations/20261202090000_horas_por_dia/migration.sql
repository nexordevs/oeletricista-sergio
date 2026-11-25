-- Horas de estudo por dia da semana e marcação das tarefas do cronograma automático
ALTER TABLE "StudyPlan" ADD COLUMN "dayMinutes" TEXT;
ALTER TABLE "StudyTask" ADD COLUMN "auto" BOOLEAN NOT NULL DEFAULT false;
-- tarefas de teoria/questões existentes vieram do gerador
UPDATE "StudyTask" SET "auto" = true WHERE kind IN ('TEORIA', 'QUESTOES');
