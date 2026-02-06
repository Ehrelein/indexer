import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { computeContentHash, computeUrlHash } from "./hash.js"
import { MAX_CONTENT_LENGTH } from "./limits.js"
import { Metrics } from "./metrics.js"
import type { SeedResult } from "./seed.js"
import { resolveUrl } from "./resolveUrl.js"

const connectionString = process.env["DATABASE_URL"] ?? ""
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export { prisma }

const STATUS_CODE_MIN = 0
const STATUS_CODE_MAX = 999
const MIN_WORD_LENGTH = 2
const WORD_BATCH_SIZE = 1000

function isValidStatusCode(code: number): boolean {
    return Number.isInteger(code) && code >= STATUS_CODE_MIN && code <= STATUS_CODE_MAX
}

function getHost(url: string): string {
    try {
        const h = new URL(url).hostname
        return h ?? ""
    } catch {
        return ""
    }
}

function collectLinkRows(fromUrlHash: string, baseUrl: string, hrefs: string[]): Array<{ fromUrlHash: string; toUrlHash: string }> {
    const seen = new Set<string>()
    const rows: Array<{ fromUrlHash: string; toUrlHash: string }> = []
    for (const href of hrefs) {
        const resolved = resolveUrl(href, baseUrl)
        if (resolved === null) continue
        const toHash = computeUrlHash(resolved)
        if (toHash === null || toHash === fromUrlHash) continue
        if (seen.has(toHash)) continue
        seen.add(toHash)
        rows.push({ fromUrlHash, toUrlHash: toHash })
    }
    return rows
}

function tokenize(content: string): string[] {
    const words = content.toLowerCase().split(/\W+/).filter(function minLen(w) {
        return w.length >= MIN_WORD_LENGTH
    })
    return [...new Set(words)]
}

async function updateRanksForTargets(toUrlHashes: string[]): Promise<void> {
    const unique = [...new Set(toUrlHashes)]
    for (const h of unique) {
        try {
            const count = await prisma.link.count({ where: { toUrlHash: h } })
            await prisma.page.updateMany({ where: { urlHash: h }, data: { rank: count } })
        } catch {
            //
        }
    }
}

export async function savePage(result: SeedResult): Promise<boolean> {
    const urlHash = computeUrlHash(result.url)
    if (urlHash === null) return false
    const contentHash = computeContentHash(result.parsed.content ?? "") ?? undefined
    const linksCount = result.parsed.localLinks.length + result.parsed.links.length
    const statusCode = isValidStatusCode(result.statusCode) ? result.statusCode : undefined
    const content = (result.parsed.content ?? "").slice(0, MAX_CONTENT_LENGTH)
    const pageHost = getHost(result.url)
    try {
        const existing = await prisma.page.findUnique({
            where: { urlHash },
            select: { url: true },
        })
        if (existing !== null && existing.url !== result.url) return false
        const page = await prisma.page.upsert({
            where: { urlHash },
            create: {
                urlHash,
                url: result.url,
                host: pageHost,
                title: result.parsed.title ?? undefined,
                description: result.parsed.description ?? undefined,
                content,
                h1: result.parsed.h1 ?? undefined,
                links: linksCount,
                rank: 0,
                statusCode,
                contentHash,
            },
            update: {
                url: result.url,
                host: pageHost,
                title: result.parsed.title ?? undefined,
                description: result.parsed.description ?? undefined,
                content,
                h1: result.parsed.h1 ?? undefined,
                links: linksCount,
                statusCode,
                contentHash,
            },
            select: { id: true },
        })
        const title = result.parsed.title ?? ""
        const description = result.parsed.description ?? ""
        const h1 = result.parsed.h1 ?? ""
        const textToIndex = [title, description, h1, content].filter(Boolean).join(" ")
        const words = tokenize(textToIndex)
        try {
            await prisma.pageWord.deleteMany({ where: { pageId: page.id } })
            for (let i = 0; i < words.length; i += WORD_BATCH_SIZE) {
                const chunk = words.slice(i, i + WORD_BATCH_SIZE)
                const data = chunk.map(function toRow(w) { return { word: w, pageId: page.id } })
                await prisma.pageWord.createMany({ data, skipDuplicates: true })
            }
        } catch {
            //
        }
        const linkRows = collectLinkRows(urlHash, result.url, result.parsed.localLinks)
        if (linkRows.length > 0) {
            try {
                await prisma.link.createMany({ data: linkRows, skipDuplicates: true })
                await updateRanksForTargets(linkRows.map(function toTarget(r) {
                    return r.toUrlHash
                }))
            } catch {
                //
            }
        }
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

export async function rebuildPageWordsFromText(pageId: number, text: string): Promise<void> {
    const words = tokenize(text)
    try {
        await prisma.pageWord.deleteMany({ where: { pageId } })
        for (let i = 0; i < words.length; i += WORD_BATCH_SIZE) {
            const chunk = words.slice(i, i + WORD_BATCH_SIZE)
            const data = chunk.map(function toRow(w) { return { word: w, pageId } })
            await prisma.pageWord.createMany({ data, skipDuplicates: true })
        }
    } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        throw new Error("rebuildPageWordsFromText failed", { cause: err })
    }
}
