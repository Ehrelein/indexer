ALTER TABLE "pages" ADD COLUMN "host" TEXT NOT NULL DEFAULT '';

CREATE INDEX "pages_host_idx" ON "pages"("host");
