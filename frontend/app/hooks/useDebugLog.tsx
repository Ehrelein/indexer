import { useRef, useState, useCallback, useEffect } from "react"

type UseDebugLogReturn = {
  ref: React.RefObject<HTMLElement | null>
  log: (...args: unknown[]) => void
}

export function useDebugLog(): UseDebugLogReturn {
  const [on, setOn] = useState(false)
  const ref = useRef<HTMLElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  useEffect(function setupToggle() {
    const element = ref.current
    if (element === null) return

    function handleMouseDown(event: MouseEvent) {
      if (event.button !== 1) return
      event.stopPropagation()
      event.preventDefault()
      setOn(prev => !prev)
    }

    element.addEventListener("mousedown", handleMouseDown)
    return function cleanup() {
      element.removeEventListener("mousedown", handleMouseDown)
    }
  }, [])

  useEffect(function updateOverlay() {
    const element = ref.current
    if (element === null) return

    let overlay = overlayRef.current

    if (on) {
      if (overlay === null) {
        overlay = document.createElement("div")
        overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: hsla(0, 70%, 50%, 0.2);
          z-index: 1000;
          pointer-events: none;
        `
        overlayRef.current = overlay
      }
      
      if (!element.contains(overlay)) {
        const computedStyle = window.getComputedStyle(element)
        if (computedStyle.position === "static") {
          element.style.position = "relative"
        }
        element.appendChild(overlay)
      }
    } else {
      if (overlay !== null && overlay.parentElement !== null) {
        overlay.parentElement.removeChild(overlay)
      }
    }
  }, [on])

  useEffect(() => {
    return () => {
      const overlay = overlayRef.current
      if (overlay !== null && overlay.parentElement !== null) {
        overlay.parentElement.removeChild(overlay)
      }
    }
  }, [])

  const log = useCallback(function debugLog(...args: unknown[]): void {
    if (on) {
      console.log(...args)
    }
  }, [on])

  return { ref, log }
}
