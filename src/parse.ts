import { JSDOM } from 'jsdom'

const MAX_LINKS = 10_000

const GARBAGE_PREFIXES = [
    "#",
    "javascript:",
    "mailto:",
    "data:",
    "tel:",
    "blob:",
] as const

const HTTP_PREFIX = "http://"
const HTTPS_PREFIX = "https://"

export type ParsedPage = {
    title: string
    description: string | null
    content: string
    h1: string | null
    localLinks: string[]
    links: string[]
}

export function parse(html: string): ParsedPage | null {
    if (html.trim() === "") return null
    try {
        const doc = new JSDOM(html)
        const document = doc.window.document
        const title = document.title

        const description =
            document
                .querySelector('meta[name="description"]')
                ?.getAttribute('content') ?? null

        const raw = document.body?.textContent ?? ""
        const content = raw.replace(/\s+/g, " ").trim()
        const h1 = document.querySelector("h1")?.textContent?.trim() ?? null

        const hrefs = Array
            .from(document.querySelectorAll("a[href]"))
            .map(getHref)
            .filter(isNotGarbage)

        const localLinks = Array
            .from(new Set(hrefs.filter(isLocalHref)))
            .slice(0, MAX_LINKS)

        const links = Array
            .from(new Set(hrefs.filter(isRegularHref)))
            .slice(0, MAX_LINKS)

        return { title, description, content, h1, localLinks, links }
    } catch {
        return null
    }
}

function getHref(element: Element): string | null {
    return element.getAttribute("href")
}

function isNotGarbage(href: string | null): href is string {
    if (href === null) return false
    const s = href.trim()
    if (s.length === 0) return false
    if (s === "#") return false
    const lower = s.toLowerCase()
    if (GARBAGE_PREFIXES.some(function starts(prefix) {
        return lower.startsWith(prefix)
    })) return false
    return true
}

function isLocalHref(href: string): boolean {
    const lower = href.trim().toLowerCase()
    if (lower.startsWith(HTTP_PREFIX)) return false
    if (lower.startsWith(HTTPS_PREFIX)) return false
    return true
}

function isRegularHref(href: string): boolean {
    const lower = href.trim().toLowerCase()
    if (lower.startsWith(HTTP_PREFIX)) return true
    if (lower.startsWith(HTTPS_PREFIX)) return true
    return false
}
