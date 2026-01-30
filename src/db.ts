import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { computeContentHash, computeUrlHash } from "./hash.js"
import { MAX_CONTENT_LENGTH } from "./limits.js"
import { Metrics } from "./metrics.js"
import type { SeedResult } from "./seed.js"

const connectionString = process.env["DATABASE_URL"] ?? ""
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export { prisma }

const STATUS_CODE_MIN = 0
const STATUS_CODE_MAX = 999

function isValidStatusCode(code: number): boolean {
    return Number.isInteger(code) && code >= STATUS_CODE_MIN && code <= STATUS_CODE_MAX
}

export async function savePage(result: SeedResult): Promise<boolean> {
    const urlHash = computeUrlHash(result.url)
    if (urlHash === null) return false
    const contentHash = computeContentHash(result.parsed.content ?? "") ?? undefined
    const linksCount = result.parsed.localLinks.length + result.parsed.links.length
    const statusCode = isValidStatusCode(result.statusCode) ? result.statusCode : undefined
    const content = (result.parsed.content ?? "").slice(0, MAX_CONTENT_LENGTH)
    try {
        const existing = await prisma.page.findUnique({
            where: { urlHash },
            select: { url: true },
        })
        if (existing !== null && existing.url !== result.url) return false
        await prisma.page.upsert({
            where: { urlHash },
            create: {
                urlHash,
                url: result.url,
                title: result.parsed.title ?? undefined,
                description: result.parsed.description ?? undefined,
                content,
                h1: result.parsed.h1 ?? undefined,
                links: linksCount,
                statusCode,
                contentHash,
            },
            update: {
                url: result.url,
                title: result.parsed.title ?? undefined,
                description: result.parsed.description ?? undefined,
                content,
                h1: result.parsed.h1 ?? undefined,
                links: linksCount,
                statusCode,
                contentHash,
            },
        })
        Metrics.incrementPageSaved()
        Metrics.addDataVolume(Buffer.byteLength(content, "utf8"))
        return true
    } catch {
        return false
    }
}

export async function savePages(results: SeedResult[]): Promise<number> {
    try {
        const outcomes = await Promise.all(results.map(savePage))
        return outcomes.filter(Boolean).length
    } catch {
        return 0
    }
}
