/// <reference types="vitest/globals" />
import { MAX_CONTENT_LENGTH, MAX_URL_LENGTH } from "../src/limits.js"
import { computeContentHash, computeUrlHash } from "../src/hash.js"

const HEX_LEN = 64
const SHA256_REGEX = /^[a-f0-9]{64}$/

describe("computeUrlHash", function () {
    test("valid URL returns 64-char hex", function () {
        const h = computeUrlHash("https://example.com/path")
        expect(h).not.toBe(null)
        expect(h?.length).toBe(HEX_LEN)
        expect(SHA256_REGEX.test(h ?? "")).toBe(true)
    })

    test("same URL gives same hash", function () {
        const u = "https://example.com/"
        expect(computeUrlHash(u)).toBe(computeUrlHash(u))
    })

    test("trailing slash on path normalizes same as no slash", function () {
        const withSlash = computeUrlHash("https://example.com/foo/")
        const noSlash = computeUrlHash("https://example.com/foo")
        expect(withSlash).toBe(noSlash)
    })

    test("root path and root with slash same hash", function () {
        expect(computeUrlHash("https://example.com")).toBe(computeUrlHash("https://example.com/"))
    })

    test("URL with query and hash normalized", function () {
        const withQ = computeUrlHash("https://example.com/p?x=1")
        const withH = computeUrlHash("https://example.com/p#a")
        expect(withQ).not.toBe(withH)
        expect(withQ?.length).toBe(HEX_LEN)
        expect(withH?.length).toBe(HEX_LEN)
    })

    test("different query different hash", function () {
        const a = computeUrlHash("https://example.com/?a=1")
        const b = computeUrlHash("https://example.com/?a=2")
        expect(a).not.toBe(b)
    })

    test("host case normalized to lowercase", function () {
        expect(computeUrlHash("https://Example.COM/")).toBe(computeUrlHash("https://example.com/"))
    })

    test("empty string returns null", function () {
        expect(computeUrlHash("")).toBe(null)
    })

    test("whitespace-only returns null", function () {
        expect(computeUrlHash("   ")).toBe(null)
    })

    test("invalid URL returns null", function () {
        expect(computeUrlHash("not-a-url")).toBe(null)
    })

    test("URL longer than MAX_URL_LENGTH returns null", function () {
        const prefix = "https://x.com/"
        const longPath = "a".repeat(MAX_URL_LENGTH - prefix.length + 1)
        const url = prefix + longPath
        expect(url.length).toBeGreaterThan(MAX_URL_LENGTH)
        expect(computeUrlHash(url)).toBe(null)
    })
})

describe("computeContentHash", function () {
    test("string returns 64-char hex", function () {
        const h = computeContentHash("hello")
        expect(h).not.toBe(null)
        expect(h?.length).toBe(HEX_LEN)
        expect(SHA256_REGEX.test(h ?? "")).toBe(true)
    })

    test("same content gives same hash", function () {
        const c = "same content"
        expect(computeContentHash(c)).toBe(computeContentHash(c))
    })

    test("different content different hash", function () {
        expect(computeContentHash("a")).not.toBe(computeContentHash("b"))
    })

    test("empty string returns hash", function () {
        const h = computeContentHash("")
        expect(h).not.toBe(null)
        expect(h?.length).toBe(HEX_LEN)
    })

    test("content at MAX_CONTENT_LENGTH returns hash", function () {
        const c = "x".repeat(MAX_CONTENT_LENGTH)
        const h = computeContentHash(c)
        expect(h).not.toBe(null)
        expect(h?.length).toBe(HEX_LEN)
    })

    test("content longer than MAX_CONTENT_LENGTH returns null", function () {
        const c = "x".repeat(MAX_CONTENT_LENGTH + 1)
        expect(computeContentHash(c)).toBe(null)
    })

    test("unicode content hashed", function () {
        const h = computeContentHash("привет 🎉")
        expect(h).not.toBe(null)
        expect(SHA256_REGEX.test(h ?? "")).toBe(true)
    })
})
