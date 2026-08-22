"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../../lib/authContext";
import { apiRequest } from "../../../../lib/apiClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ErrorBanner from "../../../../components/ErrorBanner";
import Amount from "../../../../components/Amount";
import RunningTabCard from "../../../../components/RunningTabCard";
import { Handshake, Check, Receipt, ArrowRight } from "lucide-react";

export default function SettleUpPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [suggestedSettlements, setSuggestedSettlements] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingKey, setSubmittingKey] = useState(null);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [groupRes, balancesRes, settlementsRes] = await Promise.all([
        apiRequest(`/groups/${id}`),
        apiRequest(`/groups/${id}/balances`),
        apiRequest(`/groups/${id}/settlements`),
      ]);

      setGroup(groupRes.data.group);
      setBalances(balancesRes.data.netBalances || []);
      setSuggestedSettlements(balancesRes.data.suggestedSettlements || []);
      setSettlements(settlementsRes.data.settlements || []);
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

  const handleMarkAsPaid = async (transaction) => {
    const key = `${transaction.from}-${transaction.to}`;
    if (submittingKey) return;

    setError("");
    setNotification("");
    setSubmittingKey(key);

    try {
      await apiRequest(`/groups/${id}/settlements`, {
        method: "POST",
        body: JSON.stringify({
          from: transaction.from,
          to: transaction.to,
          amount: transaction.amount,
          note: "Settlement payment",
        }),
      });

      const fromName = getUserName(transaction.from);
      const toName = getUserName(transaction.to);
      const msg = `Marked as paid: ₹${transaction.amount.toFixed(2)} from ${fromName} to ${toName}.`;
      setNotification(msg);

      // Refetch balances and settlement history
      const [balancesRes, settlementsRes] = await Promise.all([
        apiRequest(`/groups/${id}/balances`),
        apiRequest(`/groups/${id}/settlements`),
      ]);
      setBalances(balancesRes.data.netBalances || []);
      setSuggestedSettlements(balancesRes.data.suggestedSettlements || []);
      setSettlements(settlementsRes.data.settlements || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingKey(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="card">
        <LoadingSpinner label="Calculating minimal settlements..." />
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="card">
        <ErrorBanner message={error} onRetry={fetchData} />
        <Link href={`/groups/${id}`} style={{ color: "var(--moss)", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
          ← Back to Tab
        </Link>
      </div>
    );
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
    <div style={{ maxWidth: "760px", margin: "16px auto" }}>
      <div style={{ marginBottom: "16px" }}>
        <Link
          href={`/groups/${id}`}
          style={{ color: "var(--moss)", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
        >
          ← Back to {group?.name || "Tab"}
        </Link>
      </div>

      <ErrorBanner message={error} />
      {notification && (
        <div className="success-message">
          <Check size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Settle Up Header Card */}
      <div className="card" style={{ marginTop: 0, padding: "28px" }}>
        <div style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Handshake size={20} style={{ color: "var(--moss)" }} />
            <h1 className="font-display" style={{ fontSize: "24px", margin: 0 }}>
              Settle Up
            </h1>
          </div>
          <p className="font-body" style={{ color: "rgba(34, 41, 31, 0.65)", fontSize: "14px", margin: 0 }}>
            Minimal payment paths to clear all debts in <strong>{group?.name}</strong>
          </p>
        </div>

        <h2 className="font-display" style={{ fontSize: "17px", marginBottom: "12px" }}>
          Suggested Payments ({suggestedSettlements.length})
        </h2>

        {suggestedSettlements.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              backgroundColor: "rgba(79, 107, 74, 0.08)",
              border: "1px dashed var(--moss)",
              borderRadius: "8px",
            }}
          >
            <Check size={28} style={{ color: "var(--moss)", margin: "0 auto 8px auto" }} />
            <h3 className="font-display" style={{ fontSize: "17px", color: "var(--moss)", margin: "0 0 4px 0" }}>
              All settled up!
            </h3>
            <p className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.7)", margin: 0 }}>
              Everyone in this group has a zero balance. No payments needed.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {suggestedSettlements.map((t, index) => {
              const fromId = t.from.toString();
              const toId = t.to.toString();
              const fromName = getUserName(fromId);
              const toName = getUserName(toId);

              const isUserSender = fromId === currentUserId;
              const isUserReceiver = toId === currentUserId;
              const isProcessing = submittingKey === `${fromId}-${toId}`;

              return (
                <div
                  key={`${fromId}-${toId}-${index}`}
                  style={{
                    backgroundColor: "var(--paper)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div className="font-body" style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      {isUserSender ? (
                        <>
                          <span>You</span> <ArrowRight size={14} style={{ color: "rgba(34, 41, 31, 0.4)" }} /> <strong>{toName}</strong>
                        </>
                      ) : isUserReceiver ? (
                        <>
                          <strong>{fromName}</strong> <ArrowRight size={14} style={{ color: "rgba(34, 41, 31, 0.4)" }} /> <span>You</span>
                        </>
                      ) : (
                        <>
                          <strong>{fromName}</strong> <ArrowRight size={14} style={{ color: "rgba(34, 41, 31, 0.4)" }} /> <strong>{toName}</strong>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <Amount
                      value={t.amount}
                      tone={isUserSender ? "negative" : isUserReceiver ? "positive" : "neutral"}
                      style={{ fontSize: "17px" }}
                    />

                    <button
                      onClick={() => handleMarkAsPaid(t)}
                      disabled={isProcessing || Boolean(submittingKey)}
                      className="btn-primary"
                      style={{
                        width: "auto",
                        padding: "6px 14px",
                        fontSize: "12px",
                        minHeight: "32px",
                      }}
                    >
                      {isProcessing ? "Recording..." : "Mark as paid"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Signature Element: Running Tab Card (Fix 2) */}
      <div style={{ marginTop: "20px" }}>
        <RunningTabCard
          title={`${group?.name} — Tab Balances`}
          entries={balances.map((b) => {
            const uId = (b.user?._id || b.user?.id || b.user || b.userId || "").toString();
            const isSelf = currentUserId && uId === currentUserId.toString();
            const name = b.name || (typeof b.user === "object" ? b.user.name : "Member");
            return {
              label: `${name}${isSelf ? " (You)" : ""}`,
              amount: b.netBalance || 0,
              tone: b.netBalance > 0 ? "positive" : b.netBalance < 0 ? "negative" : "neutral",
            };
          })}
        />
      </div>

      {/* Past Settlements History Section */}
      <div className="card" style={{ marginTop: "20px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Receipt size={16} style={{ color: "rgba(34, 41, 31, 0.5)" }} />
          <h2 className="font-display" style={{ fontSize: "18px", margin: 0 }}>
            Past Settlements ({settlements.length})
          </h2>
        </div>

        {settlements.length === 0 ? (
          <p className="font-body" style={{ color: "rgba(34, 41, 31, 0.6)", fontSize: "13px", margin: 0, textAlign: "center", padding: "12px 0" }}>
            No settlements recorded on this tab yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {settlements.map((s) => {
              const fromName = typeof s.from === "object" ? s.from?.name : "Someone";
              const toName = typeof s.to === "object" ? s.to?.name : "Someone";

              return (
                <div
                  key={s.id || s._id}
                  className="receipt-row"
                  style={{
                    padding: "10px 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    borderBottom: "1px dotted var(--line)",
                  }}
                >
                  <div>
                    <div className="font-body" style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>
                      <strong>{fromName}</strong> paid <strong>{toName}</strong>
                    </div>
                    <div className="font-mono tabular-nums" style={{ fontSize: "11px", color: "rgba(34, 41, 31, 0.5)" }}>
                      {new Date(s.date).toLocaleDateString()} at {new Date(s.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  <Amount value={s.amount} tone="positive" style={{ fontSize: "14px" }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
