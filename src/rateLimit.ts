import { Redis } from "ioredis"

export type RateLimiter = {
    acquire(): Promise<void>
}

const REDIS_KEY_PREFIX = "crawler:rate_limit:"
const WINDOW_MS = 1000
const REDIS_WINDOW_TTL_SEC = 2

function sleep(ms: number): Promise<void> {
    return new Promise(function done(r) {
        setTimeout(r, ms)
    })
}

export function createMemoryRateLimiter(maxPerSecond: number): RateLimiter {
    let count = 0
    let windowStart = Date.now()
    return {
        async acquire() {
            for (; ;) {
                try {
                    const now = Date.now()
                    if (now - windowStart >= WINDOW_MS) {
                        count = 0
                        windowStart = now
                    }
                    if (count < maxPerSecond) break
                    await sleep(WINDOW_MS - (now - windowStart))
                } catch {
                    await sleep(WINDOW_MS)
                }
            }
            count += 1
        },
    }
}

export async function createRedisRateLimiter(
    redisUrl: string,
    maxPerSecond: number
): Promise<RateLimiter | null> {
    try {
        const client = new Redis(redisUrl)
        return {
            async acquire() {
                for (; ;) {
                    try {
                        const windowSec = Math.floor(Date.now() / WINDOW_MS)
                        const key = REDIS_KEY_PREFIX + String(windowSec)
                        const count = await client.incr(key)
                        await client.expire(key, REDIS_WINDOW_TTL_SEC)
                        if (count <= maxPerSecond) return
                        const now = Date.now()
                        const waitMs = WINDOW_MS - (now % WINDOW_MS)
                        if (waitMs > 0) await sleep(waitMs)
                    } catch {
                        try {
                            await sleep(WINDOW_MS)
                        } catch {
                            //
                        }
                    }
                }
            },
        }
    } catch {
        return null
    }
}
