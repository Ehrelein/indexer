"use client"

import { useEffect } from "react"
import { EventBus } from "@/lib/eventBus"
import { SearchButton } from "@/app/components/SearchButton"
import { useDebugLog } from "@/app/hooks/useDebugLog"

const SEARCH_FORM_DEBUG_ID = "search-form-debug"

export function SearchForm() {
  const { log } = useDebugLog(SEARCH_FORM_DEBUG_ID)

  useEffect(() => {
    const form = document.getElementById("kqpwmxnr") as HTMLFormElement | null
    const input = document.getElementById("vbhcytlz") as HTMLInputElement | null
    if (form === null || input === null) return
    log("mounted")

    function doSearch() {
      const query = (input?.value ?? "").trim()
      if (query.length === 0) return
      log("doSearch", query)
      EventBus.emit("search", { query })
    }

    function submit(e: Event) {
      e.preventDefault()
      log("submit")
      doSearch()
    }

    function keydown(e: KeyboardEvent) {
      if (e.key !== "Enter") return
      e.preventDefault()
      log("keydown Enter")
      doSearch()
    }

    function inputcb() {
      const value = (input?.value ?? "").trim()
      const disabled = value.length === 0
      log("input", value.length > 0 ? value : "(empty)")
      EventBus.emit("search-button:toggle-available", disabled)
    }

    form.addEventListener("submit", submit)
    input.addEventListener("keydown", keydown)
    form.addEventListener("input", inputcb)
    return function cleanup() {
      form.removeEventListener("submit", submit)
      input.removeEventListener("keydown", keydown)
      form.removeEventListener("input", inputcb)
    }
  }, [log])

  return (
    <div id={SEARCH_FORM_DEBUG_ID} style={{ position: "relative" }}>
      <form id="kqpwmxnr" className="input-form hover-lighten glass">
        <input
          id="vbhcytlz"
          className="chat-input"
          type="text"
          placeholder="Введите запрос"
        />
        <SearchButton />
      </form>
    </div>
  )
}
