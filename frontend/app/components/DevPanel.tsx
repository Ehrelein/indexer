"use client"

import { useState, useEffect } from "react"
import { DevMode } from "@/lib/devMode"

const DEV_PANEL_BUTTON_TOP = "1rem"
const DEV_PANEL_BUTTON_LEFT = "1rem"
const DEFAULT_FONT_SIZE = 16

const DEV_GRADIENT = "linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(59, 130, 246, 0.2) 50%, rgba(168, 85, 247, 0.2) 100%)"
const DEV_GRADIENT_LIGHT = "linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 50%, rgba(168, 85, 247, 0.15) 100%)"
const DEV_BORDER = "1px solid rgba(59, 130, 246, 0.4)"
const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 24
const FONT_COLOR_HUE_MIN = 0
const FONT_COLOR_HUE_MAX = 360
const FONT_COLOR_S_DEFAULT = 0
const FONT_COLOR_L_DEFAULT = 100
const FONT_COLOR_S_COLORED = 95
const FONT_COLOR_L_COLORED = 82
const DEFAULT_FONT_COLOR_HUE = 0

export function DevPanel() {
    const [open, setOpen] = useState(false)
    const [devOn, setDevOn] = useState(false)
    const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
    const [fontColorHue, setFontColorHue] = useState(DEFAULT_FONT_COLOR_HUE)

    useEffect(function syncDevState() {
        setDevOn(DevMode.isOn())
    }, [open])

    useEffect(function applyFontSize() {
        document.documentElement.style.fontSize = `${fontSize}px`
        return function reset() {
            document.documentElement.style.fontSize = ""
        }
    }, [fontSize])

    useEffect(function applyFontColor() {
        const s = fontColorHue === 0 ? FONT_COLOR_S_DEFAULT : FONT_COLOR_S_COLORED
        const l = fontColorHue === 0 ? FONT_COLOR_L_DEFAULT : FONT_COLOR_L_COLORED
        const value = `hsl(${fontColorHue}, ${s}%, ${l}%)`
        document.documentElement.style.setProperty("--dev-font-color", value)
        return function reset() {
            document.documentElement.style.removeProperty("--dev-font-color")
        }
    }, [fontColorHue])

    function toggleDevMode() {
        const next = !devOn
        DevMode.toggle(next)
        setDevOn(next)
    }

    return (
        <>
            <button
                type="button"
                className="dev-panel-trigger glass"
                onClick={function openPanel() { setOpen(function (prev) { return !prev }) }}
                style={{
                    position: "fixed",
                    top: DEV_PANEL_BUTTON_TOP,
                    left: DEV_PANEL_BUTTON_LEFT,
                    zIndex: 9998,
                    padding: "0.5rem 2rem",
                    borderRadius: "18px",
                    border: DEV_BORDER,
                    background: DEV_GRADIENT_LIGHT,
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25), 0 1px 0 rgba(255, 255, 255, 0.1) inset",
                    color: "rgba(255, 255, 255, 0.95)",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    minWidth: "6rem",
                }}
            >
                Dev
            </button>
            {open && (
                <div
                    className="dev-panel glass"
                    style={{
                        position: "fixed",
                        top: "calc(1rem + 2.5rem + 0.5rem)",
                        left: DEV_PANEL_BUTTON_LEFT,
                        zIndex: 9999,
                        padding: "1rem 1.25rem",
                        borderRadius: "18px",
                        border: DEV_BORDER,
                        background: DEV_GRADIENT,
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25), 0 1px 0 rgba(255, 255, 255, 0.1) inset",
                        color: "rgba(255, 255, 255, 0.95)",
                        minWidth: "12rem",
                        minHeight: "8rem",
                    }}
                >
                    <div style={{ marginBottom: "0.75rem", fontWeight: 600, fontSize: "0.95rem" }}>Dev режим</div>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", cursor: "default" }}>
                        <input
                            type="checkbox"
                            className="dev-panel-checkbox"
                            checked={devOn}
                            onChange={toggleDevMode}
                        />
                        <span>Вкл / Выкл</span>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
                        <span>Размер шрифта: {fontSize}px</span>
                        <input
                            type="range"
                            className="dev-panel-slider"
                            min={MIN_FONT_SIZE}
                            max={MAX_FONT_SIZE}
                            value={fontSize}
                            onChange={function onFontChange(e) { setFontSize(Number(e.target.value)) }}
                        />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        <span>Цвет шрифта (HSL): {fontColorHue}°</span>
                        <input
                            type="range"
                            className="dev-panel-slider dev-panel-slider-hue"
                            min={FONT_COLOR_HUE_MIN}
                            max={FONT_COLOR_HUE_MAX}
                            value={fontColorHue}
                            onChange={function onHueChange(e) { setFontColorHue(Number(e.target.value)) }}
                        />
                    </label>
                </div>
            )}
        </>
    )
}
