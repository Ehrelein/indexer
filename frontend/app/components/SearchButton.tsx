"use client"

import { EventBus } from '@/lib/eventBus'
import { useEffect } from "react"

export function SearchButton() {
  useEffect(() => {
    const button = document.getElementById('jmsbqmxhuyz') as HTMLButtonElement | null
    if (button === null) return

    const unsubscribe = EventBus.subscribe("search-button:toggle-available", disabled => {
      button.disabled = disabled
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <div>
      <button
        // style={{
        //   backgroundImage: 'url(/kepochka.png)',
        //   backgroundSize: 'contain',
        //   backgroundPosition: 'center',
        //   backgroundRepeat: 'no-repeat',
        // }} 
        id="jmsbqmxhuyz" type="submit" className="send-button glass" disabled title="Искать" aria-label="Искать">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>

  )
}
