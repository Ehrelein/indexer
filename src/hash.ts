import { createHash } from "node:crypto"
import { MAX_CONTENT_LENGTH, MAX_URL_LENGTH } from "./limits.js"

const HASH_ALGORITHM = "sha256"
const HASH_ENCODING = "hex"

function digest(input: string, maxLength: number): string | null {
    if (typeof input !== "string") return null
    if (input.length > maxLength) return null
    try {
        return createHash(HASH_ALGORITHM).update(input, "utf8").digest(HASH_ENCODING)
    } catch {
        return null
    }
}

function normalizePathname(pathname: string): string {
    if (pathname === "/") return ""
    if (pathname.endsWith("/") && pathname.length > 1) return pathname.slice(0, -1)
    return pathname
}

function normalizeUrlForHash(url: string): string | null {
    const trimmed = url.trim()
    if (trimmed === "") return null
    if (trimmed.length > MAX_URL_LENGTH) return null
    try {
        const parsed = new URL(trimmed)
        const scheme = parsed.protocol.toLowerCase()
        const host = parsed.hostname.toLowerCase()
        const path = normalizePathname(parsed.pathname)
        const pathAndSearch = path + parsed.search
        return scheme + "//" + host + pathAndSearch
    } catch {
        return null
    }
}

export function computeUrlHash(url: string): string | null {
    const normalized = normalizeUrlForHash(url)
    if (normalized === null) return null
    return digest(normalized, MAX_URL_LENGTH)
}

export function computeContentHash(content: string): string | null {
    return digest(content, MAX_CONTENT_LENGTH)
}
