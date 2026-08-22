"use client";

export default function LoadingSpinner({ label = "Loading tab..." }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        color: "rgba(34, 41, 31, 0.7)",
      }}
    >
      <div
        style={{
          width: "30px",
          height: "30px",
          border: "2px solid var(--line)",
          borderTopColor: "var(--moss)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: "10px",
        }}
      />
      <span className="font-body" style={{ fontSize: "13px", fontWeight: 500 }}>{label}</span>
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
