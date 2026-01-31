"use client"

import { useEffect } from "react"
import { EventBus } from "@/lib/eventBus"
import { trpcClient } from "@/lib/trpc-client"

const RESULTS_CONTAINER_ID = "search-results"

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

function renderPlaceholder(container: HTMLElement, message = "") {
    container.innerHTML = ""
    const p = document.createElement("p")
    p.className = "result-placeholder"
    p.textContent = message
    container.appendChild(p)
}

function renderError(container: HTMLElement, message: string) {
    container.innerHTML = ""
    const p = document.createElement("p")
    p.className = "result-error"
    p.textContent = message
    container.appendChild(p)
}

function renderLoading(container: HTMLElement) {
    container.innerHTML = ""
    const p = document.createElement("p")
    p.className = "result-loading"
    p.textContent = "Загрузка…"
    container.appendChild(p)
}

function renderResults(container: HTMLElement, results: SearchResult[]) {
    container.innerHTML = ""
    const valid = results.filter(function hasUrl(r) { return r.url.length > 0 })
    if (valid.length === 0) {
        renderPlaceholder(container, "Ничего не найдено")
        return
    }
    valid.forEach(function addItem(r) {
        const item = document.createElement("div")
        item.className = "result-item glass"
        const link = document.createElement("a")
        link.href = r.url
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        link.textContent = r.title ?? r.url
        const snippet = document.createElement("div")
        snippet.className = "result-snippet"
        snippet.textContent = r.snippet ?? ""
        const meta = document.createElement("div")
        meta.className = "result-meta"
        meta.textContent = "rank: " + String(r.rank)
        item.appendChild(link)
        item.appendChild(snippet)
        item.appendChild(meta)
        container.appendChild(item)
    })
}

export function SearchResults() {
    useEffect(function subscribeSearch() {
        const container = document.getElementById(RESULTS_CONTAINER_ID)
        if (container === null) return

        function onSearch(data: { query?: string }) {
            const el = document.getElementById(RESULTS_CONTAINER_ID)
            if (el === null) return
            const query = (data.query ?? "").trim()
            if (query === "") {
                renderPlaceholder(el, "")
                return
            }
            renderLoading(el)
            el.scrollIntoView({ behavior: "smooth", block: "start" })
            trpcClient.search.search.query({ q: query })
                .then(function applyResults(data) {
                    const c = document.getElementById(RESULTS_CONTAINER_ID)
                    if (c === null) return
                    renderResults(c, toSearchResults(data.results))
                    c.scrollIntoView({ behavior: "smooth", block: "start" })
                })
                .catch(function onError(err) {
                    const c = document.getElementById(RESULTS_CONTAINER_ID)
                    if (c === null) return
                    renderError(c, "Ошибка поиска")
                    console.error("search failed", err)
                })
        }

        renderPlaceholder(container, "")
        const unsubscribe = EventBus.subscribe("search", onSearch)
        return unsubscribe
    }, [])

    return <div id={RESULTS_CONTAINER_ID} className="search-page-results" />
}
