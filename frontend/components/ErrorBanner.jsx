"use client";

export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div
      style={{
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#b91c1c",
        fontSize: "14px",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>⚠️</span>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            width: "auto",
            backgroundColor: "transparent",
            color: "#b91c1c",
            fontWeight: 600,
            textDecoration: "underline",
            padding: "4px 8px",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
