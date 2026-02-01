"use client"

import { EventBus } from "@/lib/eventBus"
import { useEffect } from "react"
import { useDebugLog } from "@/app/hooks/useDebugLog"

const SEARCH_BUTTON_DEBUG_ID = "jmsbqmxhuyz"

export function SearchButton() {
  const { log } = useDebugLog(SEARCH_BUTTON_DEBUG_ID)

  useEffect(() => {
    const button = document.getElementById(SEARCH_BUTTON_DEBUG_ID) as HTMLButtonElement | null
    if (button === null) return
    log("mounted")

    const unsubscribe = EventBus.subscribe("search-button:toggle-available", function onToggle(disabled) {
      button.disabled = disabled
      log("disabled", disabled)
    })

    return function cleanup() {
      unsubscribe()
    }
  }, [log])

  return (
    <button
      id={SEARCH_BUTTON_DEBUG_ID}
      type="submit"
      className="send-button glass"
      disabled
      title="Искать"
      aria-label="Искать"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  )
}
