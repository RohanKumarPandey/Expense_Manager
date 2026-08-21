"use client";

export default function EmptyState({ icon = "📦", title, description, action }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        background: "#f9fafb",
        borderRadius: "8px",
        border: "1px dashed #d1d5db",
        margin: "12px 0",
      }}
    >
      {icon && <div style={{ fontSize: "36px", marginBottom: "12px" }}>{icon}</div>}
      <p style={{ color: "#1f2937", fontSize: "16px", fontWeight: 600, margin: "0 0 6px 0" }}>
        {title}
      </p>
      {description && (
        <p
          style={{
            color: "#6b7280",
            fontSize: "14px",
            margin: "0 0 16px 0",
            maxWidth: "400px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "12px" }}>{action}</div>}
    </div>
  );
}
