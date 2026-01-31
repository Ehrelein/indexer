"use client"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="ru">
            <body>
                <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
                    <p style={{ marginBottom: "1rem" }}>Критическая ошибка.</p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
                    >
                        Попробовать снова
                    </button>
                </div>
            </body>
        </html>
    )
}
