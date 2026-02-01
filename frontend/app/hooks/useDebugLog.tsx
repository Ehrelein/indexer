import { useRef, useState, useCallback, useEffect } from "react"
import { DevMode } from "@/lib/devMode"

type UseDebugLogReturn = {
    log: (...args: unknown[]) => void
}

export function useDebugLog(id: string): UseDebugLogReturn {
    const [on, setOn] = useState(false)
    const overlayRef = useRef<HTMLDivElement | null>(null)

    useEffect(function setupToggle() {
        const element = document.getElementById(id)
        if (element === null) return

        function handleMouseDown(event: MouseEvent) {
            if (event.button !== 1) return
            if (!DevMode.isOn()) return
            event.stopPropagation()
            event.preventDefault()
            setOn(function toggle(prev) { return !prev })
        }

        element.addEventListener("mousedown", handleMouseDown)
        return function cleanup() {
            element.removeEventListener("mousedown", handleMouseDown)
        }
    }, [id])

    useEffect(function updateOverlay() {
        const element = document.getElementById(id)
        if (element === null) return
        if (!on) {
            const overlay = overlayRef.current
            if (overlay !== null && overlay.parentElement !== null) overlay.parentElement.removeChild(overlay)
            return
        }

        let overlay = overlayRef.current
        if (overlay === null) {
            overlay = document.createElement("div")
            overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: hsla(0, 70%, 50%, 0.15);
        z-index: 1000;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
      `
            const badge = document.createElement("div")
            badge.textContent = "useDebugLog"
            badge.style.cssText = `
        padding: 0.5rem 1rem;
        border-radius: 18px;
        border: 1px solid rgba(239, 68, 68, 0.4);
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), 0 1px 0 rgba(255, 255, 255, 0.1) inset;
        color: rgba(255, 255, 255, 0.95);
        font-size: 0.9rem;
        font-weight: 600;
        user-select: none;
      `
            overlay.appendChild(badge)
            overlayRef.current = overlay
        }

        if (!element.contains(overlay)) {
            const computedStyle = window.getComputedStyle(element)
            if (computedStyle.position === "static") element.style.position = "relative"
            element.appendChild(overlay)
        }
    }, [id, on])

    useEffect(function cleanupOverlay() {
        return function remove() {
            const overlay = overlayRef.current
            if (overlay !== null && overlay.parentElement !== null) overlay.parentElement.removeChild(overlay)
        }
    }, [])

    const log = useCallback(function debugLog(...args: unknown[]): void {
        if (!on) return
        console.log(`[${id}]`, ...args)
    }, [id, on])

    return { log }
}
