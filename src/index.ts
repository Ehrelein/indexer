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
    REDIS_URL: "REDIS_URL",
    KAFKA_BROKERS: "KAFKA_BROKERS",
    RATE_LIMIT_PER_SECOND: "RATE_LIMIT_PER_SECOND",
} as const

const DEFAULT_RATE_LIMIT_PER_SECOND = 2

function getSeedUrl(): string | null {
    const raw = process.env[Env.SEED_URL]
    if (raw === undefined || raw === "") return null
    return raw.trim()
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

async function bootstrapSeedUrl(brokers: string, seedUrl: string): Promise<void> {
    let producer: Awaited<ReturnType<typeof CrawlKafka.producer>> = null
    try {
        producer = await CrawlKafka.producer(brokers)
    } catch {
        return
    }
    if (producer === null) return
    try {
        const sender = CrawlKafka.sender(producer, CrawlKafka.topic(), CrawlKafka.topicPriority())
        await sender.send(seedUrl, 0)
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
        const seedUrl = getSeedUrl()
        if (seedUrl !== null) await bootstrapSeedUrl(brokers, seedUrl)
        const visited = await createRedisVisitedStore(redisUrl)
        if (visited === null) {
            console.error("Redis connect failed")
            process.exit(1)
            return
        }
        const maxPerSecond = getRateLimitPerSecond()
        const rateLimiter = (await createRedisRateLimiter(redisUrl, maxPerSecond)) ?? createMemoryRateLimiter(maxPerSecond)
        await CrawlKafka.runConsumer(
            brokers,
            CrawlKafka.topic(),
            CrawlKafka.topicPriority(),
            CrawlKafka.groupId(),
            visited,
            rateLimiter
        )
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
