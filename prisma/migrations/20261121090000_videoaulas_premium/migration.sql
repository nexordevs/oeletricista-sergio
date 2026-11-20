-- Videoaulas como recurso de plano (inicialmente só no Premium)
ALTER TABLE "Plan" ADD COLUMN "featCourses" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Plan" SET "featCourses" = true WHERE "slug" = 'premium';
