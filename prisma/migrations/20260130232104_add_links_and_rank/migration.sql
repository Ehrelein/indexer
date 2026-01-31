-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "links" (
    "fromUrlHash" TEXT NOT NULL,
    "toUrlHash" TEXT NOT NULL,

    CONSTRAINT "links_pkey" PRIMARY KEY ("fromUrlHash","toUrlHash")
);

-- CreateIndex
CREATE INDEX "links_toUrlHash_idx" ON "links"("toUrlHash");

-- CreateIndex
CREATE INDEX "pages_rank_idx" ON "pages"("rank");
