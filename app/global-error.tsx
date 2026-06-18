"use client";

// Root-level error boundary (catches errors in the root layout itself). Renders
// its own <html>/<body>. Kept deliberately dependency-light since the app shell
// may have failed to load. Branded with the brand palette inline.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FBF7EE",
          color: "#123524",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.5rem" }}>Something went wrong</h1>
        <p style={{ color: "#6b7280", maxWidth: "28rem" }}>
          An unexpected error occurred. Please try again — if it persists, get in touch.
        </p>
        {error.digest ? (
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace" }}>
            Error ID: {error.digest}
          </p>
        ) : null}
        <button
          onClick={reset}
          style={{
            marginTop: "1.25rem",
            backgroundColor: "#1B6B3A",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.65rem 1.5rem",
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
