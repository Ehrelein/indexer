-- Full-text search index for fast Prisma fallback when Elasticsearch is unavailable
CREATE INDEX IF NOT EXISTS "pages_fts_idx" ON "pages" USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("content", '')));
