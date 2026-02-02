/// <reference types="vitest/globals" />
import { resolveUrl } from "../src/resolveUrl.js"

describe("resolveUrl", function () {
    const BASE = "https://example.com/page"
    const BASE_DIR = "https://example.com/dir/sub"
    const BASE_WITH_PORT = "https://example.com:8080/path"

    test("absolute http returns as-is", function () {
        expect(resolveUrl("http://other.com/", BASE)).toBe("http://other.com/")
    })

    test("absolute https returns as-is", function () {
        expect(resolveUrl("https://other.com/", BASE)).toBe("https://other.com/")
    })

    test("absolute http with path query hash unchanged", function () {
        expect(resolveUrl("http://x.com/p?q=1#h", BASE)).toBe("http://x.com/p?q=1#h")
    })

    test("HTTP uppercase in href not startsWith http:// so resolved via URL", function () {
        const r = resolveUrl("HTTP://other.com/", BASE)
        expect(r).toBe("http://other.com/")
    })

    test("relative path resolves against base", function () {
        expect(resolveUrl("/foo", BASE)).toBe("https://example.com/foo")
    })

    test("relative path with query", function () {
        expect(resolveUrl("?a=1", BASE)).toBe("https://example.com/page?a=1")
    })

    test("relative path with hash", function () {
        expect(resolveUrl("#section", BASE)).toBe("https://example.com/page#section")
    })

    test("relative path only", function () {
        expect(resolveUrl("sub", BASE)).toBe("https://example.com/sub")
    })

    test("relative ./ resolves to same dir", function () {
        expect(resolveUrl("./foo", BASE_DIR)).toBe("https://example.com/dir/foo")
    })

    test("relative ../ goes up one level from path", function () {
        expect(resolveUrl("../", BASE_DIR)).toBe("https://example.com/")
    })

    test("relative ../name goes up and appends name", function () {
        expect(resolveUrl("../up", BASE_DIR)).toBe("https://example.com/up")
    })

    test("relative ../../ goes two up", function () {
        expect(resolveUrl("../../", BASE_DIR)).toBe("https://example.com/")
    })

    test("base with port preserved in resolution", function () {
        expect(resolveUrl("x", BASE_WITH_PORT)).toBe("https://example.com:8080/x")
    })

    test("protocol-relative //host resolves to https when base is https", function () {
        expect(resolveUrl("//cdn.example.com/asset.js", BASE)).toBe("https://cdn.example.com/asset.js")
    })

    test("empty href resolves to base", function () {
        expect(resolveUrl("", BASE)).toBe(BASE)
    })

    test("invalid base returns null", function () {
        expect(resolveUrl("/path", "not-a-url")).toBe(null)
    })

    test("relative with invalid base returns null", function () {
        expect(resolveUrl("rel", "://bad")).toBe(null)
    })

    test("empty string base with relative returns null", function () {
        expect(resolveUrl("x", "")).toBe(null)
    })

    test("encoded path in relative", function () {
        expect(resolveUrl("a%20b", BASE)).toBe("https://example.com/a%20b")
    })
})
