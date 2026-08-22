"use client";

export default function Amount({ value = 0, tone = "neutral", style = {}, className = "" }) {
  const num = typeof value === "number" ? value : parseFloat(value) || 0;

  const toneClass = {
    positive: "text-moss",
    negative: "text-rust",
    neutral: "text-ink",
  }[tone] || "text-ink";

  const formatted = num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span
      className={`font-mono tabular-nums ${toneClass} ${className}`}
      style={{ fontWeight: 600, ...style }}
    >
      ₹{formatted}
    </span>
  );
}
