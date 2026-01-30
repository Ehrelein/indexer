import { Redis } from "ioredis"
import { computeUrlHash } from "./hash.js"

export type VisitedStore = {
    has(url: string): Promise<boolean>
    add(url: string): Promise<void>
    addIfAbsent(url: string): Promise<boolean>
}

const REDIS_KEY = "crawler:visited"

export function createMemoryVisitedStore(): VisitedStore {
    const set = new Set<string>()
    return {
        async has(url: string) {
            return set.has(url)
        },
        async add(url: string) {
            set.add(url)
        },
        async addIfAbsent(url: string) {
            if (set.has(url)) return false
            set.add(url)
            return true
        },
    }
}

export async function createRedisVisitedStore(redisUrl: string): Promise<VisitedStore | null> {
    try {
        const client = new Redis(redisUrl)
        return {
            async has(url: string) {
                const hash = computeUrlHash(url)
                if (hash === null) return false
                const n = await client.sismember(REDIS_KEY, hash)
                return n === 1
            },
            async add(url: string) {
                const hash = computeUrlHash(url)
                if (hash === null) return
                await client.sadd(REDIS_KEY, hash)
            },
            async addIfAbsent(url: string) {
                const hash = computeUrlHash(url)
                if (hash === null) return false
                const added = await client.sadd(REDIS_KEY, hash)
                return added === 1
            },
        }
    } catch {
        return null
    }
}
