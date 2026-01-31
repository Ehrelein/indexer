import "dotenv/config"
import { CrawlKafka } from "./kafka.js"
import { Metrics } from "./metrics.js"
import {
    createMemoryRateLimiter,
    createRedisRateLimiter,
} from "./rateLimit.js"
import { createRedisVisitedStore } from "./visited.js"

const Env = {
    SEED_URL: "SEED_URL",
    SEED_URLS: "SEED_URLS",
    REDIS_URL: "REDIS_URL",
    KAFKA_BROKERS: "KAFKA_BROKERS",
    RATE_LIMIT_PER_SECOND: "RATE_LIMIT_PER_SECOND",
} as const

const DEFAULT_RATE_LIMIT_PER_SECOND = 2

function getSeedUrls(): string[] {
    const multi = process.env[Env.SEED_URLS]
    if (multi !== undefined && multi.trim() !== "") {
        return multi
            .split(",")
            .map(function trim(s) {
                return s.trim()
            })
            .filter(function nonEmpty(s) {
                return s.length > 0
            })
    }
    const single = process.env[Env.SEED_URL]
    if (single === undefined || single.trim() === "") return []
    return [single.trim()]
}

function getRedisUrl(): string | null {
    const raw = process.env[Env.REDIS_URL]
    if (raw === undefined || raw === "") return null
    return raw.trim()
}

function getKafkaBrokers(): string | null {
    const raw = process.env[Env.KAFKA_BROKERS]
    if (raw === undefined || raw === "") return null
    return raw.trim()
}

function getRateLimitPerSecond(): number {
    const raw = process.env[Env.RATE_LIMIT_PER_SECOND]
    if (raw === undefined || raw === "") return DEFAULT_RATE_LIMIT_PER_SECOND
    const n = Number.parseInt(raw, 10)
    if (!Number.isInteger(n) || n < 1) return DEFAULT_RATE_LIMIT_PER_SECOND
    return n
}

function seedTldAllowed(seedUrl: string): boolean {
    const allowed = CrawlKafka.allowedTlds()
    if (allowed.size === 0) return true
    try {
        const hostname = new URL(seedUrl).hostname
        if (hostname === "") return false
        const tld = hostname.trim().toLowerCase().split(".").pop() ?? ""
        return tld !== "" && allowed.has(tld)
    } catch {
        return false
    }
}

async function bootstrapSeedUrls(brokers: string, urls: string[]): Promise<void> {
    const allowed = urls.filter(seedTldAllowed)
    if (allowed.length === 0) return
    let producer: Awaited<ReturnType<typeof CrawlKafka.producer>> = null
    try {
        producer = await CrawlKafka.producer(brokers)
    } catch {
        return
    }
    if (producer === null) return
    try {
        const sender = CrawlKafka.sender(producer, CrawlKafka.topic(), CrawlKafka.topicPriority())
        for (const url of allowed) {
            try {
                await sender.send(url, 0)
            } catch {
                //
            }
        }
    } finally {
        try {
            await producer.disconnect()
        } catch {
            //
        }
    }
}

async function run(): Promise<void> {
    Metrics.startServerIfConfigured()
    Metrics.setWorkersActive(1)
    try {
        const brokers = getKafkaBrokers()
        const redisUrl = getRedisUrl()
        if (brokers === null || redisUrl === null) {
            console.error("KAFKA_BROKERS and REDIS_URL are required")
            process.exit(1)
            return
        }
        const seedUrls = getSeedUrls()
        if (seedUrls.length > 0) await bootstrapSeedUrls(brokers, seedUrls)
        const visited = await createRedisVisitedStore(redisUrl)
        if (visited === null) {
            console.error("Redis connect failed")
            process.exit(1)
            return
        }
        const maxPerSecond = getRateLimitPerSecond()
        const rateLimiter = (await createRedisRateLimiter(redisUrl, maxPerSecond)) ?? createMemoryRateLimiter(maxPerSecond)
        const RECONNECT_DELAY_MS = 5000
        for (; ;) {
            await CrawlKafka.runConsumer(
                brokers,
                CrawlKafka.topic(),
                CrawlKafka.topicPriority(),
                CrawlKafka.groupId(),
                visited,
                rateLimiter
            )
            await new Promise(function resolveAfter(r) {
                setTimeout(r, RECONNECT_DELAY_MS)
            })
        }
    } catch (reason) {
        console.error(reason)
        process.exit(1)
    }
}

run().then(
    function onFulfilled() {
        process.exit(0)
    },
    function onRejected(reason: unknown) {
        console.error(reason)
        process.exit(1)
    }
)
