"use client";

import { Receipt } from "lucide-react";

export default function RunningTabCard({ title = "Running Tab", entries = [] }) {
  // entries: [{ label: "Test Group", amount: 595.02, tone: "positive" }, ...]
  // tone: "positive" (owed to you) | "negative" (you owe) | "neutral"

  const toneClass = {
    positive: "text-moss",
    negative: "text-rust",
    neutral: "text-ink",
  };

  return (
    <div className="running-tab-card">
      {/* perforated edge — the torn-receipt detail */}
      <div className="running-tab-perforation" />
      <div style={{ padding: "24px", paddingTop: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Receipt size={16} style={{ color: "rgba(34, 41, 31, 0.5)" }} />
          <h3 className="font-display" style={{ fontSize: "18px", color: "var(--ink)", margin: 0 }}>
            {title}
          </h3>
        </div>

        {!entries || entries.length === 0 ? (
          <p className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.6)", margin: 0, textAlign: "center", padding: "12px 0" }}>
            No balances on this tab yet.
          </p>
        ) : (
          <div>
            {entries.map((entry, i) => (
              <div
                key={i}
                className="receipt-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "8px 0",
                  borderBottom: i === entries.length - 1 ? "none" : "1px dotted var(--line)",
                }}
              >
                <span className="font-body" style={{ fontSize: "14px", color: "rgba(34, 41, 31, 0.75)" }}>
                  {entry.label}
                </span>
                <span className={`font-mono tabular-nums ${toneClass[entry.tone] || "text-ink"}`} style={{ fontWeight: 600, fontSize: "14px" }}>
                  {entry.tone === "negative" ? "− " : entry.tone === "positive" ? "+ " : ""}
                  ₹{Math.abs(entry.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
