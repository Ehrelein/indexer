export function resolveUrl(href: string, baseUrl: string): string | null {
    if (isAbsoluteUrl(href)) return href
    try {
        return new URL(href, baseUrl).href
    } catch {
        return null
    }
}

function isAbsoluteUrl(url: string): boolean {
    return url.startsWith("http://") || url.startsWith("https://")
}