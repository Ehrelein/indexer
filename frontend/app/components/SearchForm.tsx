"use client"

import { useEffect } from "react"
import { EventBus } from "@/lib/eventBus"
import { SearchButton } from "@/app/components/SearchButton"

export function SearchForm() {
  useEffect(() => {
    const form = document.getElementById("kqpwmxnr") as HTMLFormElement | null
    const input = document.getElementById("vbhcytlz") as HTMLInputElement | null
    if (form === null || input === null) return

    function doSearch() {
      const query = (input?.value ?? "").trim()
      if (query.length === 0) return
      EventBus.emit("search", { query })
    }

    function submit(e: Event) {
      e.preventDefault()
      doSearch()
    }

    function keydown(e: KeyboardEvent) {
      if (e.key !== "Enter") return
      e.preventDefault()
      doSearch()
    }

    function inputcb() {
      const disabled = (input?.value ?? "").trim().length === 0
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
  }, [])

  return (
    <form id="kqpwmxnr" className="input-form hover-lighten glass">
      <input
        id="vbhcytlz"
        className="chat-input"
        type="text"
        placeholder="Введите запрос"
      />
      <SearchButton />
    </form>
  )
}
