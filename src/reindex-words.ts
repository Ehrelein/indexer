import "dotenv/config"
import { prisma } from "./db.js"
import { rebuildPageWordsFromText } from "./db.js"

async function run() {
    try {
        const pages = await prisma.page.findMany({
            select: { id: true, title: true, description: true, h1: true, content: true },
        })
        const parts = [pages.length, "pages"]
        console.log("Reindexing", parts.join(" "))
        for (const p of pages) {
            const title = p.title ?? ""
            const description = p.description ?? ""
            const h1 = p.h1 ?? ""
            const content = p.content ?? ""
            const text = [title, description, h1, content].filter(Boolean).join(" ")
            await rebuildPageWordsFromText(p.id, text)
        }
        console.log("Done.")
    } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        throw new Error("reindex run failed", { cause: err })
    }
}

run()
    .then(function exit() {
        process.exit(0)
    })
    .catch(function err(e: unknown) {
        console.error(e)
        process.exit(1)
    })
