"use client"

import { useEffect, useRef, useState } from "react"
import { EventBus } from "@/lib/eventBus"
import { trpcClient } from "@/lib/trpc-client"

type SearchResult = {
    url: string
    title: string | null
    snippet: string | null
    rank: number
}

function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null && !Array.isArray(x)
}

function isSearchResult(x: unknown): x is SearchResult {
    if (!isRecord(x)) return false
    return typeof x.url === "string" && (x.title === null || typeof x.title === "string") && (x.snippet === null || typeof x.snippet === "string") && typeof x.rank === "number"
}

function toSearchResults(val: unknown): SearchResult[] {
    if (!Array.isArray(val)) return []
    return val.filter(isSearchResult)
}

type Status = "idle" | "loading" | "done" | "error"

export function SearchResults() {
    const [status, setStatus] = useState<Status>("idle")
    const [results, setResults] = useState<SearchResult[]>([])
    const [errorMessage, setErrorMessage] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function runSearch(data: { query?: string }) {
            const query = (data.query ?? "").trim()
            if (query === "") {
                setStatus("idle")
                setResults([])
                setErrorMessage("")
                return
            }
            setStatus("loading")
            setErrorMessage("")
            containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            trpcClient.search.search.query({ q: query })
                .then(function applyResults(data) {
                    setResults(toSearchResults(data.results))
                    setStatus("done")
                    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                })
                .catch(function onError(err: unknown) {
                    setStatus("error")
                    setErrorMessage("Ошибка поиска")
                    setResults([])
                    console.error("search failed", err)
                })
        }
        const unsubscribe = EventBus.subscribe("search", runSearch)
        return unsubscribe
    }, [])

    function renderBody() {
        if (status === "loading") return <p className="result-loading">Загрузка…</p>
        if (status === "error") return <p className="result-error">{errorMessage}</p>
        if (status === "done" && results.length === 0) return <p className="result-placeholder">Ничего не найдено</p>
        if (status === "idle") return <p className="result-placeholder" />
        const valid = results.filter(function hasUrl(r) { return r.url.length > 0 })
        if (valid.length === 0) return <p className="result-placeholder">Ничего не найдено</p>
        return (
            <>
                {valid.map(function ResultItem(r) {
                    return (
                        <div key={r.url} className="result-item glass">
                            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title ?? r.url}</a>
                            <div className="result-snippet">{r.snippet ?? ""}</div>
                            <div className="result-meta">rank: {r.rank}</div>
                        </div>
                    )
                })}
            </>
        )
    }

    return (
        <div ref={containerRef} className="search-page-results">
            {renderBody()}
        </div>
    )
}
