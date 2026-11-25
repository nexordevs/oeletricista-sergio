-- CreateTable
CREATE TABLE "StudyQuestionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "subjectId" TEXT,
    "topicId" TEXT,
    "questions" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "minutes" INTEGER,
    "source" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyQuestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyQuestionLog_userId_date_idx" ON "StudyQuestionLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "StudyQuestionLog" ADD CONSTRAINT "StudyQuestionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyQuestionLog" ADD CONSTRAINT "StudyQuestionLog_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyQuestionLog" ADD CONSTRAINT "StudyQuestionLog_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "StudyTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudyQuestionLog" ENABLE ROW LEVEL SECURITY;
