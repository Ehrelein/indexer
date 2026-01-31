import { Kafka } from "kafkajs"
import type { Producer } from "kafkajs"
import { prisma } from "./db.js"
import { savePage } from "./db.js"
import { fetchHtml } from "./fetch.js"
import { MAX_URL_LENGTH } from "./limits.js"
import { Metrics } from "./metrics.js"
import { parse } from "./parse.js"
import { resolveUrl } from "./resolveUrl.js"
import type { RateLimiter } from "./rateLimit.js"
import type { VisitedStore } from "./visited.js"

export type CrawlPayload = { url: string; depth: number }

export type UrlSender = {
    send(url: string, depth: number): Promise<void>
    sendPriority(url: string, depth: number): Promise<void>
}

const DELAY_MS = 100
const DEFAULT_MAX_DEPTH = 3
const MAX_PAGES_PER_HOST = 100
const DEFAULTS = { topic: "crawl-urls", topicPriority: "crawl-urls-priority", groupId: "crawler-1" } as const

const ENV_KEYS: Record<keyof typeof DEFAULTS, string> = {
    topic: "CRAWL_TOPIC",
    topicPriority: "CRAWL_TOPIC_PRIORITY",
    groupId: "CRAWL_GROUP_ID",
}

function env(key: keyof typeof DEFAULTS): string {
    const v = process.env[ENV_KEYS[key]]
    return (v ?? "").trim() || DEFAULTS[key]
}

const ENV_MAX_DEPTH = "CRAWL_MAX_DEPTH"
const ENV_ALLOWED_TLDS = "CRAWL_ALLOWED_TLDS"

function getMaxDepth(): number {
    const raw = process.env[ENV_MAX_DEPTH]
    if (raw === undefined || raw === "") return DEFAULT_MAX_DEPTH
    const n = Number.parseInt(raw.trim(), 10)
    if (!Number.isInteger(n) || n < 0) return DEFAULT_MAX_DEPTH
    return n
}

function getAllowedTlds(): Set<string> {
    const raw = process.env[ENV_ALLOWED_TLDS]
    if (raw === undefined || raw === "") return new Set<string>()
    return new Set(
        raw
            .split(",")
            .map(function normalize(s) {
                return s.trim().toLowerCase().replace(/^\./, "").replace(/\.$/, "")
            })
            .filter(function nonEmpty(s) {
                return s.length > 0
            })
    )
}

function tldFromHost(hostname: string): string {
    const normalized = hostname.trim().toLowerCase()
    if (normalized === "") return ""
    const parts = normalized.split(".")
    const last = parts[parts.length - 1]
    return last ?? ""
}

function parsePayload(raw: string): CrawlPayload | null {
    const s = raw.trim()
    if (s === "") return null
    if (!s.startsWith("{")) return { url: s, depth: 0 }
    try {
        const o = JSON.parse(s) as unknown
        if (o === null || typeof o !== "object" || !("url" in o) || typeof (o as CrawlPayload).url !== "string") return null
        const depth = Number((o as { depth?: unknown }).depth)
        if (!Number.isInteger(depth) || depth < 0) return null
        return { url: (o as CrawlPayload).url, depth }
    } catch {
        return null
    }
}

function host(url: string): string | null {
    try {
        return new URL(url).hostname
    } catch {
        return null
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(function done(r) {
        setTimeout(r, ms)
    })
}

async function handleUrl(
    url: string,
    depth: number,
    maxDepth: number,
    allowedTlds: Set<string>,
    visited: VisitedStore,
    sender: UrlSender,
    rateLimiter?: RateLimiter
): Promise<void> {
    if (url.length > MAX_URL_LENGTH) return
    const base = host(url)
    if (base === null || base === "") return
    const tld = tldFromHost(base)
    if (allowedTlds.size > 0 && !allowedTlds.has(tld)) {
        Metrics.incrementTldRejected()
        return
    }
    try {
        if (!(await visited.addIfAbsent(url))) return
        const hostPageCount = await prisma.page.count({ where: { host: base } })
        if (hostPageCount >= MAX_PAGES_PER_HOST) return
        if (rateLimiter !== undefined) {
            try {
                await rateLimiter.acquire()
            } catch {
                //
            }
        }
        const onFetchError = function reportErrorType(type: string) {
            Metrics.incrementFetchError(type)
        }
        const t0 = Date.now()
        const res = await fetchHtml(url, { onFetchError })
        if (res === null) return
        const parsed = parse(res.html)
        if (parsed === null) return
        await savePage({ url, statusCode: res.statusCode, parsed })
        Metrics.observePageDuration((Date.now() - t0) / 1000)
        if (depth >= maxDepth) return
        const hostPageCountAfter = await prisma.page.count({ where: { host: base } })
        if (hostPageCountAfter >= MAX_PAGES_PER_HOST) return
        const nextDepth = depth + 1
        await Promise.all(
            parsed.localLinks.map(async function push(href) {
                try {
                    const r = resolveUrl(href, url)
                    if (r === null || r.length > MAX_URL_LENGTH || host(r) !== base) return
                    if (await visited.has(r)) return
                    await sender.sendPriority(r, nextDepth)
                } catch {
                    //
                }
            })
        )
    } catch {
        //
    }
}

type PendingMessage = {
    payload: { topic: string; partition: number; message: { value: Buffer | null } }
    resolve: () => void
}

async function connect(
    brokers: string,
    topicMain: string,
    topicPriority: string,
    groupId: string
): Promise<{ producer: Producer; consumer: Awaited<ReturnType<Kafka["consumer"]>> } | null> {
    const kafka = new Kafka({
        clientId: "crawler",
        brokers: brokers.split(",").map(function trim(s) {
            return s.trim()
        }),
    })
    const producer = kafka.producer()
    const consumer = kafka.consumer({ groupId })
    try {
        await producer.connect()
    } catch {
        return null
    }
    try {
        await consumer.connect()
    } catch {
        await producer.disconnect()
        return null
    }
    try {
        await consumer.subscribe({ topics: [topicPriority, topicMain], fromBeginning: true })
    } catch {
        await consumer.disconnect()
        await producer.disconnect()
        return null
    }
    return { producer, consumer }
}

export const CrawlKafka = {
    topic() {
        return env("topic")
    },
    topicPriority() {
        return env("topicPriority")
    },
    groupId() {
        return env("groupId")
    },
    client(brokers: string) {
        return new Kafka({
            clientId: "crawler",
            brokers: brokers.split(",").map(function trim(s) {
                return s.trim()
            }),
        })
    },
    async producer(brokers: string): Promise<Producer | null> {
        try {
            const p = CrawlKafka.client(brokers).producer()
            await p.connect()
            return p
        } catch {
            return null
        }
    },
    maxDepth() {
        return getMaxDepth()
    },
    allowedTlds() {
        return getAllowedTlds()
    },
    sender(producer: Producer, topicMain: string, topicPriority: string): UrlSender {
        return {
            async send(url: string, depth: number) {
                if (url.length > MAX_URL_LENGTH) return
                try {
                    const value = JSON.stringify({ url, depth })
                    await producer.send({ topic: topicMain, messages: [{ value }] })
                    Metrics.incrementKafkaSent()
                } catch {
                    //
                }
            },
            async sendPriority(url: string, depth: number) {
                if (url.length > MAX_URL_LENGTH) return
                try {
                    const value = JSON.stringify({ url, depth })
                    await producer.send({ topic: topicPriority, messages: [{ value }] })
                    Metrics.incrementKafkaSent()
                } catch {
                    //
                }
            },
        }
    },
    async runConsumer(
        brokers: string,
        topicMain: string,
        topicPriority: string,
        groupId: string,
        visited: VisitedStore,
        rateLimiter?: RateLimiter
    ) {
        let conn: Awaited<ReturnType<typeof connect>> = null
        try {
            conn = await connect(brokers, topicMain, topicPriority, groupId)
            if (conn === null) return
            const maxDepth = CrawlKafka.maxDepth()
            const allowedTlds = CrawlKafka.allowedTlds()
            if (allowedTlds.size > 0) {
                const list = [...allowedTlds].sort().join(", ")
                console.error(`CRAWL_ALLOWED_TLDS active (${allowedTlds.size}): ${list}. URLs with other TLDs skipped (crawler_tld_rejected_total).`)
            }
            const sender = CrawlKafka.sender(conn.producer, topicMain, topicPriority)
            const priorityQueue: PendingMessage[] = []
            const mainQueue: PendingMessage[] = []
            conn.consumer.run({
                eachMessage: async function onMessage(payload) {
                    const resolvePromise = new Promise<void>(function resolveOnce(resolve) {
                        const item: PendingMessage = { payload, resolve }
                        if (payload.topic === topicPriority) priorityQueue.push(item)
                        else mainQueue.push(item)
                    })
                    await resolvePromise
                },
            })
            for (; ;) {
                const item = priorityQueue.shift() ?? mainQueue.shift()
                if (item === undefined) {
                    await sleep(100)
                    continue
                }
                try {
                    const v = item.payload.message.value
                    if (v === null || v === undefined) {
                        item.resolve()
                        continue
                    }
                    const payload = parsePayload(v.toString())
                    if (payload === null) {
                        item.resolve()
                        await sleep(DELAY_MS)
                        continue
                    }
                    if (payload.depth > maxDepth) {
                        item.resolve()
                        await sleep(DELAY_MS)
                        continue
                    }
                    await handleUrl(payload.url, payload.depth, maxDepth, allowedTlds, visited, sender, rateLimiter)
                    await sleep(DELAY_MS)
                } catch {
                    //
                }
                item.resolve()
            }
        } catch {
            if (conn !== null) {
                await conn.consumer.disconnect()
                await conn.producer.disconnect()
            }
        }
    },
}
