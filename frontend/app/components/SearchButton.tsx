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
        id="jmsbqmxhuyz" type="submit" className="glass" disabled title="Искать" aria-label="Искать">
      </button>
    </div>

  )
}
