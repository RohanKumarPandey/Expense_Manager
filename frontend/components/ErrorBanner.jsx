"use client";

import { AlertCircle } from "lucide-react";

export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div
      style={{
        backgroundColor: "rgba(168, 73, 47, 0.08)",
        border: "1px solid rgba(168, 73, 47, 0.3)",
        color: "var(--rust)",
        fontSize: "14px",
        borderRadius: "8px",
        padding: "10px 14px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <AlertCircle size={16} style={{ color: "var(--rust)", flexShrink: 0 }} />
        <span className="font-body" style={{ fontWeight: 500 }}>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-destructive"
          style={{
            width: "auto",
            padding: "3px 8px",
            fontSize: "12px",
            minHeight: "26px",
            borderRadius: "6px",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
