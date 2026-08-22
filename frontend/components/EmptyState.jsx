"use client";

import { Receipt } from "lucide-react";

export default function EmptyState({
  icon = <Receipt size={28} style={{ color: "rgba(34, 41, 31, 0.4)" }} />,
  title = "No expenses yet",
  description = "Add the first one to start the tab.",
  action,
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "36px 20px",
        background: "var(--white)",
        borderRadius: "8px",
        border: "1px dashed var(--line)",
        margin: "14px 0",
      }}
    >
      {icon && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
          {icon}
        </div>
      )}
      <h3
        className="font-display"
        style={{
          color: "var(--ink)",
          fontSize: "17px",
          fontWeight: 700,
          margin: "0 0 6px 0",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="font-body"
          style={{
            color: "rgba(34, 41, 31, 0.65)",
            fontSize: "13px",
            margin: "0 0 14px 0",
            maxWidth: "380px",
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "10px" }}>{action}</div>}
    </div>
  );
}
