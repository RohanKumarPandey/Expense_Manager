"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../lib/authContext";
import { apiRequest } from "../../../lib/apiClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Balances state
  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Expenses state
  const [expenses, setExpenses] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const fetchGroupDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/groups/${id}`);
      setGroup(res.data.group);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchBalances = useCallback(async () => {
    try {
      setBalancesLoading(true);
      const res = await apiRequest(`/groups/${id}/balances`);
      setBalances(res.data.balances || []);
    } catch (err) {
      console.error("Failed to fetch balances:", err.message);
    } finally {
      setBalancesLoading(false);
    }
  }, [id]);

  const fetchExpenses = useCallback(async (pageNum = 1) => {
    try {
      setExpensesLoading(true);
      const res = await apiRequest(`/groups/${id}/expenses?page=${pageNum}&limit=10`);
      setExpenses(res.data.expenses || []);
      setPage(res.data.currentPage || 1);
      setTotalPages(res.data.totalPages || 1);
      setTotalExpenses(res.data.totalExpenses || 0);
    } catch (err) {
      // Don't overwrite group error if group loaded
      console.error("Failed to fetch expenses:", err.message);
    } finally {
      setExpensesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && id) {
      fetchGroupDetail();
      fetchBalances();
      fetchExpenses(page);
    }
  }, [user, authLoading, id, router, page, fetchGroupDetail, fetchBalances, fetchExpenses]);

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    setError("");
    try {
      await apiRequest(`/groups/${id}/leave`, { method: "DELETE" });
      router.push("/groups");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the group?`)) return;
    setError("");
    setActionMessage("");
    try {
      await apiRequest(`/groups/${id}/members/${userId}`, { method: "DELETE" });
      setActionMessage(`Removed ${userName} from group.`);
      fetchGroupDetail();
      fetchBalances();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteExpense = async (expenseId, description) => {
    if (!confirm(`Are you sure you want to delete the expense "${description}"?`)) return;
    setError("");
    setActionMessage("");
    try {
      await apiRequest(`/groups/${id}/expenses/${expenseId}`, { method: "DELETE" });
      setActionMessage(`Expense "${description}" deleted.`);
      fetchExpenses(page);
      fetchBalances();
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) {
    return <div className="card">Loading group detail...</div>;
  }

  if (error && !group) {
    return (
      <div className="card">
        <div className="error-message">{error}</div>
        <Link href="/groups" style={{ color: "#2563eb" }}>← Back to Groups</Link>
      </div>
    );
  }

  const currentUserId = user?._id || user?.id;
  const currentMember = group?.members?.find(
    (m) => (m.user?._id || m.user?.id || m.user) === currentUserId
  );
  const isAdmin = currentMember?.role === "admin";

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "rent": return { bg: "#fee2e2", text: "#991b1b" };
      case "groceries": return { bg: "#dcfce7", text: "#166534" };
      case "utilities": return { bg: "#fef3c7", text: "#92400e" };
      case "food": return { bg: "#ffedd5", text: "#9a3412" };
      case "travel": return { bg: "#e0e7ff", text: "#3730a3" };
      default: return { bg: "#f3f4f6", text: "#374151" };
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <Link href="/groups" style={{ color: "#2563eb", fontSize: "14px", textDecoration: "none" }}>
          ← Back to Groups
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}
      {actionMessage && <div className="success-message">{actionMessage}</div>}

      {/* Group Header Card */}
      <div className="card" style={{ marginTop: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "24px", marginBottom: "4px" }}>{group.name}</h1>
            {group.description && <p style={{ color: "#6b7280", fontSize: "14px" }}>{group.description}</p>}
          </div>
          <button
            onClick={handleLeaveGroup}
            style={{ width: "auto", backgroundColor: "#dc2626", padding: "6px 12px", fontSize: "13px" }}
          >
            Leave Group
          </button>
        </div>

        <div style={{ background: "#f3f4f6", padding: "12px", borderRadius: "6px", marginTop: "16px" }}>
          <p style={{ fontSize: "14px", margin: 0 }}>
            Invite Code: <strong style={{ letterSpacing: "1px", color: "#1e40af" }}>{group.inviteCode}</strong>
            <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>(Share this code with flatmates)</span>
          </p>
        </div>

        {/* Member List Section */}
        <h2 style={{ fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>
          Members ({group.members?.length || 0})
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {group.members?.map((m) => {
            const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "User", email: "" };
            const memberId = memberUser._id || memberUser.id;
            const isSelf = memberId === currentUserId;

            return (
              <div
                key={memberId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  background: "#fff",
                }}
              >
                <div>
                  <strong style={{ fontSize: "15px" }}>{memberUser.name}</strong>{" "}
                  {isSelf && <span style={{ fontSize: "12px", color: "#2563eb" }}>(You)</span>}
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>{memberUser.email}</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: m.role === "admin" ? "#dbeafe" : "#f3f4f6",
                      color: m.role === "admin" ? "#1e40af" : "#374151",
                      fontWeight: 500,
                    }}
                  >
                    {m.role}
                  </span>

                  {isAdmin && !isSelf && (
                    <button
                      onClick={() => handleRemoveMember(memberId, memberUser.name)}
                      style={{ width: "auto", padding: "4px 8px", fontSize: "12px", backgroundColor: "#ef4444" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Balances Section */}
      <div className="card" style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", margin: 0 }}>Group Balances</h2>
          <Link href={`/groups/${id}/settle`}>
            <button
              style={{
                width: "auto",
                padding: "6px 14px",
                fontSize: "13px",
                backgroundColor: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              🤝 Settle Up
            </button>
          </Link>
        </div>

        {balancesLoading ? (
          <div style={{ padding: "12px 0", color: "#6b7280", fontSize: "14px", textAlign: "center" }}>
            Calculating balances...
          </div>
        ) : balances.length === 0 ? (
          <div style={{ padding: "12px 0", color: "#6b7280", fontSize: "14px", textAlign: "center" }}>
            No balances available.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            {balances.map((b) => {
              const uId = (b.user?._id || b.user?.id || b.user).toString();
              const memberInfo = group?.members?.find(
                (m) => (m.user?._id || m.user?.id || m.user).toString() === uId
              );
              const userName =
                typeof b.user === "object" && b.user.name
                  ? b.user.name
                  : typeof memberInfo?.user === "object"
                  ? memberInfo.user.name
                  : "Member";
              const isSelf = uId === currentUserId;

              const isOwed = b.netBalance > 0;
              const owes = b.netBalance < 0;
              const isSettled = b.netBalance === 0;

              return (
                <div
                  key={uId}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: isOwed ? "#bbf7d0" : owes ? "#fecaca" : "#e5e7eb",
                    backgroundColor: isOwed ? "#f0fdf4" : owes ? "#fef2f2" : "#f9fafb",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#1f2937" }}>
                      {userName} {isSelf && <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: 400 }}>(You)</span>}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                    {isOwed && (
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "#15803d" }}>
                        is owed ₹{b.netBalance.toFixed(2)}
                      </span>
                    )}
                    {owes && (
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "#b91c1c" }}>
                        owes ₹{Math.abs(b.netBalance).toFixed(2)}
                      </span>
                    )}
                    {isSettled && (
                      <span style={{ fontSize: "14px", fontWeight: 500, color: "#6b7280" }}>
                        Settled up (₹0.00)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="card" style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", margin: 0 }}>Expenses ({totalExpenses})</h2>
          </div>
          <Link href={`/groups/${id}/add`}>
            <button style={{ width: "auto", padding: "6px 14px", fontSize: "13px", backgroundColor: "#2563eb" }}>
              + Add Expense
            </button>
          </Link>
        </div>

        {expensesLoading ? (
          <div style={{ padding: "16px 0", color: "#6b7280", fontSize: "14px", textAlign: "center" }}>
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: "16px 0", color: "#6b7280", fontSize: "14px", textAlign: "center" }}>
            No expenses recorded yet. Click <strong>+ Add Expense</strong> above to add one!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {expenses.map((exp) => {
              const paidByName = typeof exp.paidBy === "object" ? exp.paidBy?.name : "Someone";
              const isCreator = (exp.createdBy?._id || exp.createdBy?.id || exp.createdBy) === currentUserId;
              const canDelete = isCreator || isAdmin;
              const catStyle = getCategoryColor(exp.category);

              return (
                <div
                  key={exp._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    background: "#ffffff",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "15px", color: "#111827" }}>{exp.description}</strong>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "1px 6px",
                          borderRadius: "10px",
                          background: catStyle.bg,
                          color: catStyle.text,
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {exp.category}
                      </span>
                    </div>

                    <div style={{ fontSize: "13px", color: "#6b7280" }}>
                      Paid by <strong>{paidByName}</strong> • Split with {exp.participants?.length || 0} members •{" "}
                      {new Date(exp.date || exp.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                        ₹{(exp.amount / 100).toFixed(2)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "capitalize" }}>
                        {exp.splitType || "equal"} split
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {isCreator && (
                        <Link href={`/groups/${id}/edit/${exp._id}`}>
                          <button
                            style={{
                              width: "auto",
                              padding: "4px 8px",
                              fontSize: "12px",
                              backgroundColor: "#eff6ff",
                              color: "#2563eb",
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            Edit
                          </button>
                        </Link>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteExpense(exp._id, exp.description)}
                          style={{
                            width: "auto",
                            padding: "4px 8px",
                            fontSize: "12px",
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    width: "auto",
                    padding: "4px 10px",
                    fontSize: "13px",
                    backgroundColor: page <= 1 ? "#e5e7eb" : "#f3f4f6",
                    color: page <= 1 ? "#9ca3af" : "#374151",
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ← Previous
                </button>

                <span style={{ fontSize: "13px", color: "#6b7280" }}>
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    width: "auto",
                    padding: "4px 10px",
                    fontSize: "13px",
                    backgroundColor: page >= totalPages ? "#e5e7eb" : "#f3f4f6",
                    color: page >= totalPages ? "#9ca3af" : "#374151",
                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
