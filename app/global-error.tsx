"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ backgroundColor: "#0a0a0f", color: "#e4e4e7", padding: "2rem", fontFamily: "monospace" }}>
        <h1 style={{ color: "#ef4444" }}>Something went wrong</h1>
        <pre style={{ color: "#f59e0b", whiteSpace: "pre-wrap", marginTop: "1rem" }}>
          {error.message}
        </pre>
        <pre style={{ color: "#71717a", whiteSpace: "pre-wrap", marginTop: "0.5rem", fontSize: "12px" }}>
          {error.stack}
        </pre>
        {error.digest && (
          <p style={{ color: "#71717a", marginTop: "0.5rem" }}>Digest: {error.digest}</p>
        )}
        <button
          onClick={() => reset()}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#7c3aed",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
