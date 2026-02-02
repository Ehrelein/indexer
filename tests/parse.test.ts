/// <reference types="vitest/globals" />
import { parse } from "../src/parse.js"

describe("parse", function () {
    test("empty string returns null", function () {
        expect(parse("")).toBe(null)
    })

    test("whitespace only returns null", function () {
        expect(parse("   \n\t  ")).toBe(null)
    })

    test("minimal body returns title and content", function () {
        const html = "<!DOCTYPE html><html><head><title>Hi</title></head><body>Hello</body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.title).toBe("Hi")
        expect(out?.content).toBe("Hello")
        expect(out?.description).toBe(null)
        expect(out?.h1).toBe(null)
        expect(out?.localLinks).toEqual([])
        expect(out?.links).toEqual([])
    })

    test("no body yields empty content", function () {
        const html = "<!DOCTYPE html><html><head><title>T</title></head></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.content).toBe("")
    })

    test("no head yields empty title", function () {
        const html = "<!DOCTYPE html><html><body>x</body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.title).toBe("")
    })

    test("meta description and h1 extracted", function () {
        const html = "<!DOCTYPE html><html><head><meta name=\"description\" content=\"Desc text\"></head><body><h1>Heading</h1></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.description).toBe("Desc text")
        expect(out?.h1).toBe("Heading")
    })

    test("multiple h1 only first taken", function () {
        const html = "<!DOCTYPE html><html><body><h1>First</h1><h1>Second</h1></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.h1).toBe("First")
    })

    test("local links collected", function () {
        const html = "<!DOCTYPE html><html><body><a href=\"/a\">A</a><a href=\"/b\">B</a></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.localLinks).toContain("/a")
        expect(out?.localLinks).toContain("/b")
        expect(out?.links).toEqual([])
    })

    test("duplicate hrefs deduped", function () {
        const html = "<!DOCTYPE html><html><body><a href=\"/x\">1</a><a href=\"/x\">2</a></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.localLinks).toEqual(["/x"])
    })

    test("external http and https in links", function () {
        const html = "<!DOCTYPE html><html><body><a href=\"http://other.com/\">X</a><a href=\"https://other.com/\">Y</a></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.links).toContain("http://other.com/")
        expect(out?.links).toContain("https://other.com/")
    })

    test("HTTP uppercase in href treated as external", function () {
        const html = "<!DOCTYPE html><html><body><a href=\"HTTP://other.com/\">X</a></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.links).toContain("HTTP://other.com/")
    })

    test("mailto javascript data tel blob excluded", function () {
        const html = "<!DOCTYPE html><html><body><a href=\"mailto:x@y.com\">M</a><a href=\"javascript:void(0)\">J</a><a href=\"data:text/plain,x\">D</a><a href=\"tel:+1\">T</a><a href=\"blob:u\">B</a><a href=\"/ok\">OK</a></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.localLinks).toEqual(["/ok"])
        expect(out?.links).toEqual([])
    })

    test("hash only href excluded", function () {
        const html = "<!DOCTYPE html><html><body><a href=\"#\">X</a><a href=\"#anchor\">Y</a><a href=\"/p\">P</a></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.localLinks).toEqual(["/p"])
    })

    test("empty href excluded", function () {
        const html = "<!DOCTYPE html><html><body><a href=\"\">E</a><a href=\"/only\">Only</a></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.localLinks).toEqual(["/only"])
    })

    test("local relative path and ./ included", function () {
        const html = "<!DOCTYPE html><html><body><a href=\"rel\">R</a><a href=\"./cur\">C</a></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.localLinks).toContain("rel")
        expect(out?.localLinks).toContain("./cur")
    })

    test("content whitespace normalized", function () {
        const html = "<!DOCTYPE html><html><body>  one   two\nthree  </body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.content).toBe("one two three")
    })

    test("content only whitespace yields empty", function () {
        const html = "<!DOCTYPE html><html><body>   \n  </body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.content).toBe("")
    })

    test("local links capped at 10000", function () {
        const links = Array.from({ length: 10001 }, function (_, i) {
            return `<a href="/l${i}">L</a>`
        }).join("")
        const html = `<!DOCTYPE html><html><body>${links}</body></html>`
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.localLinks.length).toBe(10000)
    })

    test("external links capped at 10000", function () {
        const links = Array.from({ length: 10001 }, function (_, i) {
            return `<a href="https://ex.com/p${i}">X</a>`
        }).join("")
        const html = `<!DOCTYPE html><html><body>${links}</body></html>`
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.links.length).toBe(10000)
    })

    test("a without href not selected", function () {
        const html = "<!DOCTYPE html><html><body><a>No href</a><a href=\"/y\">Y</a></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.localLinks).toEqual(["/y"])
    })

    test("script and style text in body appear in content", function () {
        const html = "<!DOCTYPE html><html><body>hello<script>x</script>world<style>.x{}</style></body></html>"
        const out = parse(html)
        expect(out).not.toBe(null)
        expect(out?.content).toContain("hello")
        expect(out?.content).toContain("world")
    })
})
