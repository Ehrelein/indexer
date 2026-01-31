-- CreateTable
CREATE TABLE "page_words" (
    "word" TEXT NOT NULL,
    "pageId" INTEGER NOT NULL,

    CONSTRAINT "page_words_pkey" PRIMARY KEY ("word","pageId")
);

-- CreateIndex
CREATE INDEX "page_words_word_idx" ON "page_words"("word");

-- AddForeignKey
ALTER TABLE "page_words" ADD CONSTRAINT "page_words_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
