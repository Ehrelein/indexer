-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "pages" (
    "id" SERIAL NOT NULL,
    "urlHash" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "content" TEXT,
    "h1" TEXT,
    "links" INTEGER NOT NULL DEFAULT 0,
    "statusCode" INTEGER,
    "lastCrawled" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT DEFAULT '',

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_urlHash_key" ON "pages"("urlHash");

-- CreateIndex
CREATE UNIQUE INDEX "pages_url_key" ON "pages"("url");

-- CreateIndex
CREATE INDEX "pages_title_idx" ON "pages"("title");

-- CreateIndex
CREATE INDEX "pages_lastCrawled_idx" ON "pages"("lastCrawled");
