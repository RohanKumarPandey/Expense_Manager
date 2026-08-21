"use client";

export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        color: "#6b7280",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          border: "3px solid #e5e7eb",
          borderTopColor: "#2563eb",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: "12px",
        }}
      />
      <span style={{ fontSize: "14px", fontWeight: 500 }}>{label}</span>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
