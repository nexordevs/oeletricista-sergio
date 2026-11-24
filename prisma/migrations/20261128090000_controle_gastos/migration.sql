-- CreateEnum
CREATE TYPE "BudgetGroup" AS ENUM ('ESSENCIAL', 'DESEJO', 'RESERVA');

-- AlterTable
ALTER TABLE "FinanceEntry" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "group" "BudgetGroup" NOT NULL DEFAULT 'ESSENCIAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetCategory_userId_idx" ON "BudgetCategory"("userId");

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BudgetCategory" ENABLE ROW LEVEL SECURITY;
