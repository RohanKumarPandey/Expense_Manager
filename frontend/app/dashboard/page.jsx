"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../lib/authContext";
import { apiRequest } from "../../lib/apiClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBanner from "../../components/ErrorBanner";
import EmptyState from "../../components/EmptyState";

const CategoryPieChart = dynamic(
  () => import("../../components/CategoryPieChart"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "280px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        Loading chart...
      </div>
    ),
  }
);

const MonthlySpendChart = dynamic(
  () => import("../../components/MonthlySpendChart"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "280px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        Loading chart...
      </div>
    ),
  }
);

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiRequest("/dashboard");
      setDashboardData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      fetchDashboard();
    }
  }, [user, authLoading, router, fetchDashboard]);

  if (authLoading || loading) {
    return (
      <div className="card">
        <LoadingSpinner label="Aggregating household financial data..." />
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="card">
        <ErrorBanner message={error} onRetry={fetchDashboard} />
        <Link href="/groups" style={{ color: "#2563eb", textDecoration: "none", fontSize: "14px" }}>
          ← Back to Groups
        </Link>
      </div>
    );
  }

  const {
    totalOwed = 0,
    totalOwing = 0,
    groupsSummary = [],
    categoryBreakdown = [],
    monthlyTrend = [],
    recentActivity = [],
  } = dashboardData || {};

  const netOverall = totalOwed - totalOwing;

  return (
    <div>
      {/* Top Header & Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 700, margin: 0, color: "#111827" }}>
            📊 Household Dashboard
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px", margin: 0 }}>
            Cross-group financial overview for <strong>{user?.name}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/groups">
            <button
              style={{
                width: "auto",
                padding: "8px 14px",
                fontSize: "13px",
                backgroundColor: "#2563eb",
              }}
            >
              My Groups
            </button>
          </Link>
          <Link href="/">
            <button
              style={{
                width: "auto",
                padding: "8px 14px",
                fontSize: "13px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
              }}
            >
              Home
            </button>
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Top Level Financial Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {/* You Are Owed Card */}
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "18px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            You are owed
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#15803d", marginTop: "4px" }}>
            ₹{totalOwed.toFixed(2)}
          </div>
          <div style={{ fontSize: "12px", color: "#166534", marginTop: "4px" }}>
            Across all groups
          </div>
        </div>

        {/* You Owe Card */}
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "18px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            You owe
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#dc2626", marginTop: "4px" }}>
            ₹{totalOwing.toFixed(2)}
          </div>
          <div style={{ fontSize: "12px", color: "#991b1b", marginTop: "4px" }}>
            Across all groups
          </div>
        </div>

        {/* Net Position Card */}
        <div
          style={{
            backgroundColor: netOverall > 0 ? "#eff6ff" : netOverall < 0 ? "#fff7ed" : "#f9fafb",
            border: "1px solid",
            borderColor: netOverall > 0 ? "#bfdbfe" : netOverall < 0 ? "#fed7aa" : "#e5e7eb",
            borderRadius: "8px",
            padding: "18px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Net Position
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: netOverall > 0 ? "#2563eb" : netOverall < 0 ? "#c2410c" : "#374151",
              marginTop: "4px",
            }}
          >
            {netOverall >= 0 ? `+₹${netOverall.toFixed(2)}` : `-₹${Math.abs(netOverall).toFixed(2)}`}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            {netOverall > 0
              ? "Overall in credit"
              : netOverall < 0
              ? "Overall in debt"
              : "All settled up"}
          </div>
        </div>
      </div>

      {/* Per-Group Breakdown Section */}
      <div className="card" style={{ marginTop: 0, marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "14px" }}>
          Per-Group Balances ({groupsSummary.length})
        </h2>

        {groupsSummary.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No group balances yet"
            description="Join or create a flatmate group to see your aggregated financial standing."
            action={
              <Link href="/groups">
                <button style={{ width: "auto", padding: "8px 16px", fontSize: "13px" }}>
                  Create or Join Group
                </button>
              </Link>
            }
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            {groupsSummary.map((g) => {
              const isOwed = g.netBalance > 0;
              const owes = g.netBalance < 0;
              const isSettled = g.netBalance === 0;

              return (
                <div
                  key={g.groupId}
                  style={{
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: isOwed ? "#bbf7d0" : owes ? "#fecaca" : "#e5e7eb",
                    backgroundColor: isOwed ? "#f0fdf4" : owes ? "#fef2f2" : "#f9fafb",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <Link
                      href={`/groups/${g.groupId}`}
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#111827",
                        textDecoration: "none",
                      }}
                    >
                      {g.groupName} →
                    </Link>
                  </div>

                  <div>
                    {isOwed && (
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "#15803d" }}>
                        is owed ₹{g.netBalance.toFixed(2)}
                      </span>
                    )}
                    {owes && (
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "#b91c1c" }}>
                        owes ₹{Math.abs(g.netBalance).toFixed(2)}
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

      {/* Visualizations Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Category Breakdown (Personal Share) */}
        <div className="card" style={{ marginTop: 0 }}>
          <div style={{ marginBottom: "14px" }}>
            <h2 style={{ fontSize: "18px", margin: 0 }}>Where My Money Goes</h2>
            <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px", margin: 0 }}>
              Category breakdown based on <strong>your personal share</strong>
            </p>
          </div>
          <CategoryPieChart data={categoryBreakdown} />
        </div>

        {/* Monthly Household Spend Trend */}
        <div className="card" style={{ marginTop: 0 }}>
          <div style={{ marginBottom: "14px" }}>
            <h2 style={{ fontSize: "18px", margin: 0 }}>Household Spend Trend</h2>
            <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px", margin: 0 }}>
              Total group spending over time across all groups
            </p>
          </div>
          <MonthlySpendChart data={monthlyTrend} />
        </div>
      </div>

      {/* Cross-Group Recent Activity Feed */}
      <div className="card" style={{ marginTop: 0 }}>
        <h2 style={{ fontSize: "18px", marginBottom: "14px" }}>
          Recent Activity Feed ({recentActivity.length})
        </h2>

        {recentActivity.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: "14px", textAlign: "center", padding: "20px 0" }}>
            No recent activity recorded across your groups.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recentActivity.map((item, index) => {
              const isExpense = item.type === "expense";
              const dateStr = item.date
                ? new Date(item.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recent";

              return (
                <div
                  key={item.data?.id || item.data?._id || index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    backgroundColor: isExpense ? "#ffffff" : "#f0fdf4",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "18px",
                        padding: "6px",
                        borderRadius: "8px",
                        background: isExpense ? "#eff6ff" : "#dcfce7",
                      }}
                    >
                      {isExpense ? "💳" : "🤝"}
                    </span>

                    <div>
                      {isExpense ? (
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                          <strong>{item.data?.paidBy?.name || "Member"}</strong> added{" "}
                          <em>"{item.data?.description || "Expense"}"</em>
                        </div>
                      ) : (
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#166534" }}>
                          <strong>{item.data?.from?.name || "Member"}</strong> paid{" "}
                          <strong>{item.data?.to?.name || "Member"}</strong>
                          {item.data?.note ? ` (${item.data.note})` : ""}
                        </div>
                      )}

                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                        {isExpense && item.data?.category && (
                          <span
                            style={{
                              textTransform: "capitalize",
                              marginRight: "6px",
                              fontWeight: 500,
                            }}
                          >
                            {item.data.category} •
                          </span>
                        )}
                        {dateStr}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: isExpense ? "#111827" : "#166534",
                      textAlign: "right",
                    }}
                  >
                    ₹{item.data?.amount?.toFixed(2)}
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
