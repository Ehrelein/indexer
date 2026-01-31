import { z } from "zod"
import { router, publicProcedure } from "../trpc"
import { prisma } from "../db"

const PAGE_SIZE = 20
const MIN_WORD_LENGTH = 2

function tokenize(text: string): string[] {
  const words = text.toLowerCase().split(/\W+/).filter(function minLen(w) {
    return w.length >= MIN_WORD_LENGTH
  })
  return [...new Set(words)]
}

function snippetFromContent(content: string | null, maxLen: number): string {
  if (content === null || content === "") return ""
  const trimmed = content.trim()
  if (trimmed.length <= maxLen) return trimmed
  return trimmed.slice(0, maxLen) + "\u2026"
}

export const searchRouter = router({
  search: publicProcedure
    .input(z.object({ q: z.string() }))
    .query(async function searchQuery({ input }) {
      const q = input.q.trim()
      if (q === "") return { results: [] }

      const words = tokenize(q)
      if (words.length === 0) return { results: [] }

      const pageIds = await prisma.pageWord.findMany({
        where: { word: { in: words } },
        select: { pageId: true },
        distinct: ["pageId"],
      })
      const ids = pageIds.map(function toId(p) { return p.pageId })
      if (ids.length === 0) return { results: [] }

      const rows = await prisma.page.findMany({
        where: { id: { in: ids } },
        orderBy: { rank: "desc" },
        take: PAGE_SIZE,
        select: { url: true, title: true, content: true, rank: true },
      })
      const results = rows.map(function mapRow(r) {
        return {
          url: r.url,
          title: r.title,
          snippet: snippetFromContent(r.content, 160),
          rank: r.rank,
        }
      })
      return { results }
    }),
})
