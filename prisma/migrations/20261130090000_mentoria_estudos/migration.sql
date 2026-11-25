-- CreateEnum
CREATE TYPE "StudyKind" AS ENUM ('TEORIA', 'QUESTOES', 'REVISAO', 'SIMULADO');

-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('PENDENTE', 'FEITO');

-- CreateTable
CREATE TABLE "StudyPlan" (
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'PMPB – Soldado',
    "examDate" TIMESTAMP(3),
    "dailyMinutes" INTEGER NOT NULL DEFAULT 180,
    "blockMinutes" INTEGER NOT NULL DEFAULT 60,
    "weeklyQuestions" INTEGER NOT NULL DEFAULT 300,
    "studyDays" TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
    "reviewDays" TEXT NOT NULL DEFAULT '1,7,15',
    "simuladoEvery" INTEGER NOT NULL DEFAULT 15,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "StudySubject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudySubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyTopic" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "studiedAt" TIMESTAMP(3),

    CONSTRAINT "StudyTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kind" "StudyKind" NOT NULL,
    "subjectId" TEXT,
    "topicId" TEXT,
    "title" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 60,
    "status" "StudyStatus" NOT NULL DEFAULT 'PENDENTE',
    "doneAt" TIMESTAMP(3),
    "questions" INTEGER,
    "correct" INTEGER,
    "originalDate" TIMESTAMP(3),
    "rescheduledCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudySubject_userId_idx" ON "StudySubject"("userId");

-- CreateIndex
CREATE INDEX "StudyTopic_subjectId_idx" ON "StudyTopic"("subjectId");

-- CreateIndex
CREATE INDEX "StudyTask_userId_date_idx" ON "StudyTask"("userId", "date");

-- AddForeignKey
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySubject" ADD CONSTRAINT "StudySubject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTopic" ADD CONSTRAINT "StudyTopic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTask" ADD CONSTRAINT "StudyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTask" ADD CONSTRAINT "StudyTask_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTask" ADD CONSTRAINT "StudyTask_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "StudyTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudyPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudySubject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudyTopic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudyTask" ENABLE ROW LEVEL SECURITY;
