-- AlterTable
ALTER TABLE "ServiceTemplate" ADD COLUMN     "maxPrice" DECIMAL(10,2),
ADD COLUMN     "minPrice" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "SiteImage" (
    "key" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteImage_pkey" PRIMARY KEY ("key")
);
ALTER TABLE "SiteImage" ENABLE ROW LEVEL SECURITY;
