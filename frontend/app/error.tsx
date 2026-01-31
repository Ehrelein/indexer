"use client"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="search-page-content" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ marginBottom: "1rem" }}>Что-то пошло не так.</p>
            <button
                type="button"
                onClick={reset}
                className="glass"
                style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
            >
                Попробовать снова
            </button>
        </div>
    )
}
