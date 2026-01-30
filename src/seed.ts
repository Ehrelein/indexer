import { fetchHtml } from "./fetch.js"
import type { ParsedPage } from "./parse.js"
import { MAX_URL_LENGTH } from "./limits.js"
import { Metrics } from "./metrics.js"
import { parse } from "./parse.js"
import { resolveUrl } from "./resolveUrl.js"
import type { UrlSender } from "./kafka.js"
import type { RateLimiter } from "./rateLimit.js"
import type { VisitedStore } from "./visited.js"
import { createMemoryVisitedStore } from "./visited.js"

const DEFAULT_MAX_PAGES = 100
const DELAY_MS = 1500

const ALLOWED_TLDS = new Set([
    "com",
    "net",
    "org",
    "io",
    "ru",
    "de",
    "fr",
    "uk",
    "edu",
    "gov",
    "co",
    "info",
    "biz",
])

export type SeedResult = {
    url: string
    statusCode: number
    parsed: ParsedPage
}

export async function seed(
    seedUrl: string,
    options?: { maxPages?: number; visited?: VisitedStore; kafkaSender?: UrlSender; rateLimiter?: RateLimiter }
): Promise<SeedResult[]> {
    const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES
    const visited = options?.visited ?? createMemoryVisitedStore()
    const kafkaSender = options?.kafkaSender
    const rateLimiter = options?.rateLimiter
    if (seedUrl.length > MAX_URL_LENGTH) return []
    const seedHostname = getHostname(seedUrl)
    if (seedHostname === null) return []
    const tld = getTld(seedHostname)
    if (tld === null || !ALLOWED_TLDS.has(tld.toLowerCase())) return []
    const queue: string[] = [seedUrl]
    const results: SeedResult[] = []
    return runCrawl(queue, visited, results, seedHostname, maxPages, kafkaSender, rateLimiter)
}

function delayMs(ms: number): Promise<void> {
    return new Promise(function resolveAfter(resolve) {
        setTimeout(resolve, ms)
    })
}

function getHostname(url: string): string | null {
    try {
        return new URL(url).hostname
    } catch {
        return null
    }
}

function getTld(hostname: string): string | null {
    const parts = hostname.split(".")
    const last = parts[parts.length - 1]
    return last ?? null
}

async function runCrawl(
    queue: string[],
    visited: VisitedStore,
    results: SeedResult[],
    seedHostname: string,
    maxPages: number,
    kafkaSender?: UrlSender,
    rateLimiter?: RateLimiter
): Promise<SeedResult[]> {
    const onFetchError = function reportErrorType(type: string) {
        Metrics.incrementFetchError(type)
    }
    while (queue.length > 0 && results.length < maxPages) {
        try {
            const url = queue.shift()
            if (url === undefined) break
            const already = await visited.has(url)
            if (already) continue
            await visited.add(url)
            if (rateLimiter !== undefined) {
                try {
                    await rateLimiter.acquire()
                } catch {
                    //
                }
            }
            const t0 = Date.now()
            const fetchResult = await fetchHtml(url, { onFetchError })
            if (fetchResult === null) continue
            const parsed = parse(fetchResult.html)
            if (parsed === null) continue
            const elapsed = (Date.now() - t0) / 1000
            Metrics.observePageDuration(elapsed)
            results.push({
                url,
                statusCode: fetchResult.statusCode,
                parsed,
            })
            await enqueueSameDomainLinks(queue, visited, parsed.localLinks, url, seedHostname, kafkaSender)
            Metrics.setQueueSize(queue.length)
        } catch {
            //
        }
        try {
            await delayMs(DELAY_MS)
        } catch {
            //
        }
    }
    return results
}

async function enqueueSameDomainLinks(
    queue: string[],
    visited: VisitedStore,
    localLinks: string[],
    baseUrl: string,
    seedHostname: string,
    kafkaSender?: UrlSender
): Promise<void> {
    const resolvedList = localLinks
        .map(function toResolved(href) {
            return resolveUrl(href, baseUrl)
        })
        .filter((r): r is string => r !== null)
    const valid = resolvedList.filter(function sameDomain(r) {
        if (r.length > MAX_URL_LENGTH) return false
        const hostname = getHostname(r)
        if (hostname === null) return false
        return hostname === seedHostname
    })
    //
    try {
        await Promise.all(
            valid.map(async function pushIfNew(resolved) {
                try {
                    const already = await visited.has(resolved)
                    if (!already) {
                        queue.push(resolved)
                        if (kafkaSender !== undefined) await kafkaSender.sendPriority(resolved, 1)
                    }
                } catch {
                    //
                }
            })
        )
    } catch {
        //
    }
}
