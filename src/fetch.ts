import { MAX_CONTENT_LENGTH, MAX_URL_LENGTH } from "./limits.js"

const FETCH_TIMEOUT_MS = 10_000

export type FetchResult = {
    html: string
    statusCode: number
}

export type FetchOptions = {
    onFetchError?(type: string): void
}

export function fetchHtml(url: string, options?: FetchOptions): Promise<FetchResult | null> {
    if (url.length > MAX_URL_LENGTH) return Promise.resolve(null)
    const onFetchError = options?.onFetchError
    function reportAndNull(type: string): null {
        onFetchError?.(type)
        return null
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(function abortOnTimeout() {
        controller.abort()
    }, FETCH_TIMEOUT_MS)
    function onResponse(res: Response): Promise<FetchResult | null> {
        clearTimeout(timeoutId)
        const contentLength = res.headers.get("content-length")
        if (contentLength !== null) {
            const size = parseInt(contentLength, 10)
            if (Number.isNaN(size) === false && size > MAX_CONTENT_LENGTH) {
                void res.body?.cancel()
                return Promise.resolve(reportAndNull("body_too_large"))
            }
        }
        return res.text().then(function withStatus(html: string): FetchResult | null {
            if (html.length > MAX_CONTENT_LENGTH) return reportAndNull("body_too_large")
            return toResult(html, res.status)
        })
    }
    function onCatch(reason: unknown): null {
        clearTimeout(timeoutId)
        const type = reason instanceof Error && reason.name === "AbortError" ? "timeout" : "network"
        return reportAndNull(type)
    }
    return globalThis
        .fetch(url, { signal: controller.signal })
        .then(onResponse)
        .then(filterErrorStatus(reportAndNull))
        .catch(onCatch)
}

function toResult(html: string, statusCode: number): FetchResult {
    return { html, statusCode }
}

function filterErrorStatus(reportAndNull: (type: string) => null): (result: FetchResult | null) => FetchResult | null {
    return function filter(result: FetchResult | null): FetchResult | null {
        if (result === null) return null
        if (result.statusCode >= 500) return reportAndNull("status_5xx")
        if (result.statusCode >= 400) return reportAndNull("status_4xx")
        return result
    }
}
