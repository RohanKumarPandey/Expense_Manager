"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../../lib/authContext";
import { apiRequest } from "../../../../lib/apiClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function SettleUpPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [suggestedSettlements, setSuggestedSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [groupRes, balancesRes] = await Promise.all([
        apiRequest(`/groups/${id}`),
        apiRequest(`/groups/${id}/balances`),
      ]);

      setGroup(groupRes.data.group);
      setSuggestedSettlements(balancesRes.data.suggestedSettlements || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && id) {
      fetchData();
    }
  }, [user, authLoading, id, router, fetchData]);

  const handleMarkAsPaid = (transaction) => {
    // TODO: wire to settlements endpoint in Milestone 8
    console.log("Mark as paid clicked for transaction:", transaction);
    setNotification(
      `Payment of ₹${transaction.amount.toFixed(2)} recorded locally. (Settlement API will be wired in Milestone 8)`
    );
    setTimeout(() => setNotification(""), 4000);
  };

  if (authLoading || loading) {
    return <div className="card">Loading settlement details...</div>;
  }

  const currentUserId = (user?._id || user?.id || "").toString();

  const getUserName = (userId) => {
    const member = group?.members?.find(
      (m) => (m.user?._id || m.user?.id || m.user).toString() === userId.toString()
    );
    if (member && typeof member.user === "object" && member.user.name) {
      return member.user.name;
    }
    return "Member";
  };

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <Link
          href={`/groups/${id}`}
          style={{ color: "#2563eb", fontSize: "14px", textDecoration: "none" }}
        >
          ← Back to {group?.name || "Group"}
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}
      {notification && <div className="success-message">{notification}</div>}

      <div className="card" style={{ marginTop: 0 }}>
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "6px" }}>
            🤝 Settle Up & Debt Simplification
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
            Simplified transactions to clear all debts within{" "}
            <strong>{group?.name}</strong> with the fewest possible payments.
          </p>
        </div>

        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "12px 14px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "#1e40af",
            lineHeight: "1.5",
          }}
        >
          💡 <strong>How this works:</strong> Instead of settling every individual expense
          separately, our debt simplification matches the largest debtors with the
          largest creditors. This settles all group debts in at most{" "}
          <strong>{Math.max(1, (group?.members?.length || 1) - 1)}</strong> transactions.
        </div>

        <h2 style={{ fontSize: "18px", marginBottom: "14px" }}>
          Suggested Payments ({suggestedSettlements.length})
        </h2>

        {suggestedSettlements.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "36px 16px",
              backgroundColor: "#f0fdf4",
              border: "1px dashed #86efac",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎉</div>
            <h3 style={{ fontSize: "17px", color: "#166534", margin: "0 0 6px 0" }}>
              All settled up!
            </h3>
            <p style={{ fontSize: "14px", color: "#15803d", margin: 0 }}>
              Everyone in this group has a zero balance. No payments are needed right now.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {suggestedSettlements.map((t, index) => {
              const fromId = t.from.toString();
              const toId = t.to.toString();
              const fromName = getUserName(fromId);
              const toName = getUserName(toId);

              const isUserSender = fromId === currentUserId;
              const isUserReceiver = toId === currentUserId;

              let cardBg = "#ffffff";
              let borderColor = "#e5e7eb";
              let badgeColor = "#374151";
              let badgeBg = "#f3f4f6";

              if (isUserSender) {
                cardBg = "#fef2f2";
                borderColor = "#fecaca";
                badgeColor = "#991b1b";
                badgeBg = "#fee2e2";
              } else if (isUserReceiver) {
                cardBg = "#f0fdf4";
                borderColor = "#bbf7d0";
                badgeColor = "#166534";
                badgeBg = "#dcfce7";
              }

              return (
                <div
                  key={`${fromId}-${toId}-${index}`}
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: "8px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: badgeBg,
                          color: badgeColor,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {isUserSender
                          ? "You pay"
                          : isUserReceiver
                          ? "You receive"
                          : "Group transfer"}
                      </span>
                    </div>

                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>
                      {isUserSender ? (
                        <>
                          You pay <strong>{toName}</strong>
                        </>
                      ) : isUserReceiver ? (
                        <>
                          <strong>{fromName}</strong> pays you
                        </>
                      ) : (
                        <>
                          <strong>{fromName}</strong> pays <strong>{toName}</strong>
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          color: isUserSender ? "#dc2626" : isUserReceiver ? "#16a34a" : "#111827",
                        }}
                      >
                        ₹{t.amount.toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={() => handleMarkAsPaid(t)}
                      style={{
                        width: "auto",
                        padding: "6px 14px",
                        fontSize: "13px",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Mark as Paid
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
