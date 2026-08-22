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
import Amount from "../../components/Amount";
import CategoryTag from "../../components/CategoryTag";
import RunningTabCard from "../../components/RunningTabCard";
import { Wallet, Receipt, ArrowRight, Handshake } from "lucide-react";

const CategoryPieChart = dynamic(
  () => import("../../components/CategoryPieChart"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "260px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(34, 41, 31, 0.5)",
          fontSize: "13px",
        }}
      >
        Loading breakdown chart...
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
          height: "260px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(34, 41, 31, 0.5)",
          fontSize: "13px",
        }}
      >
        Loading trend chart...
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
        <LoadingSpinner label="Aggregating household ledgers..." />
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="card">
        <ErrorBanner message={error} onRetry={fetchDashboard} />
        <Link href="/groups" style={{ color: "var(--moss)", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
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
      {/* Top Header & Context Area */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 className="font-display" style={{ fontSize: "26px", margin: "0 0 2px 0", color: "var(--ink)" }}>
            Ledger Dashboard
          </h1>
          <p className="font-body" style={{ color: "rgba(34, 41, 31, 0.65)", fontSize: "14px", margin: 0 }}>
            Cross-tab financial standing for <strong>{user?.name}</strong>
          </p>
        </div>

        <Link href="/groups" style={{ textDecoration: "none" }}>
          <button
            className="btn-primary"
            style={{
              width: "auto",
              padding: "6px 14px",
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Wallet size={15} />
            <span>My Tabs</span>
          </button>
        </Link>
      </div>

      <ErrorBanner message={error} />

      {/* Top Level Financial Summary Cards with monospace amounts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {/* Owed to You */}
        <div
          className="card"
          style={{
            marginTop: 0,
            padding: "18px 20px",
            borderLeft: "3px solid var(--moss)",
          }}
        >
          <div className="font-body" style={{ fontSize: "12px", fontWeight: 600, color: "var(--moss)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            Owed to you
          </div>
          <div style={{ fontSize: "26px" }}>
            <Amount value={totalOwed} tone="positive" style={{ fontSize: "26px", fontWeight: 700 }} />
          </div>
          <div className="font-body" style={{ fontSize: "12px", color: "rgba(34, 41, 31, 0.6)", marginTop: "2px" }}>
            Across all household tabs
          </div>
        </div>

        {/* You Owe */}
        <div
          className="card"
          style={{
            marginTop: 0,
            padding: "18px 20px",
            borderLeft: "3px solid var(--rust)",
          }}
        >
          <div className="font-body" style={{ fontSize: "12px", fontWeight: 600, color: "var(--rust)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            You owe
          </div>
          <div style={{ fontSize: "26px" }}>
            <Amount value={totalOwing} tone="negative" style={{ fontSize: "26px", fontWeight: 700 }} />
          </div>
          <div className="font-body" style={{ fontSize: "12px", color: "rgba(34, 41, 31, 0.6)", marginTop: "2px" }}>
            Outstanding household debt
          </div>
        </div>

        {/* Net Standing */}
        <div
          className="card"
          style={{
            marginTop: 0,
            padding: "18px 20px",
            borderLeft: `3px solid ${netOverall > 0 ? "var(--moss)" : netOverall < 0 ? "var(--rust)" : "var(--line)"}`,
          }}
        >
          <div className="font-body" style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            Net Standing
          </div>
          <div style={{ fontSize: "26px" }}>
            <Amount value={Math.abs(netOverall)} tone={netOverall > 0 ? "positive" : netOverall < 0 ? "negative" : "neutral"} style={{ fontSize: "26px", fontWeight: 700 }} />
          </div>
          <div className="font-body" style={{ fontSize: "12px", color: "rgba(34, 41, 31, 0.6)", marginTop: "2px" }}>
            {netOverall > 0
              ? "Overall in credit"
              : netOverall < 0
              ? "Overall in debt"
              : "All settled up"}
          </div>
        </div>
      </div>

      {/* Signature Element: RunningTabCard wired into Dashboard (Fix 2) */}
      <div style={{ marginBottom: "20px" }}>
        <RunningTabCard
          title="Per-Tab Standing"
          entries={groupsSummary.map((g) => ({
            label: g.groupName,
            amount: g.netBalance,
            tone: g.netBalance > 0 ? "positive" : g.netBalance < 0 ? "negative" : "neutral",
          }))}
        />
      </div>

      {/* Visualizations Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {/* Category Breakdown */}
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <div style={{ marginBottom: "12px" }}>
            <h2 className="font-display" style={{ fontSize: "17px", margin: 0 }}>
              Where My Money Goes
            </h2>
            <p className="font-body" style={{ color: "rgba(34, 41, 31, 0.6)", fontSize: "12px", margin: 0 }}>
              Category breakdown of your personal share
            </p>
          </div>
          <CategoryPieChart data={categoryBreakdown} />
        </div>

        {/* Monthly Spend Trend */}
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <div style={{ marginBottom: "12px" }}>
            <h2 className="font-display" style={{ fontSize: "17px", margin: 0 }}>
              Household Spending Trend
            </h2>
            <p className="font-body" style={{ color: "rgba(34, 41, 31, 0.6)", fontSize: "12px", margin: 0 }}>
              Total spending over the last 6 months
            </p>
          </div>
          <MonthlySpendChart data={monthlyTrend} />
        </div>
      </div>

      {/* Cross-Group Recent Activity Feed */}
      <div className="card" style={{ marginTop: 0, padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Receipt size={16} style={{ color: "rgba(34, 41, 31, 0.5)" }} />
          <h2 className="font-display" style={{ fontSize: "18px", margin: 0 }}>
            Recent Activity ({recentActivity.length})
          </h2>
        </div>

        {recentActivity.length === 0 ? (
          <EmptyState
            title="No recent activity"
            description="When expenses or settlements are added to any tab, they'll appear here."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
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
                  className="receipt-row"
                  style={{
                    padding: "10px 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    borderBottom: index === recentActivity.length - 1 ? "none" : "1px dotted var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    {isExpense ? (
                      <Receipt size={14} style={{ color: "rgba(34, 41, 31, 0.5)", flexShrink: 0 }} />
                    ) : (
                      <Handshake size={14} style={{ color: "var(--moss)", flexShrink: 0 }} />
                    )}
                    <div>
                      <div className="font-body" style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>
                        {isExpense ? (
                          <>
                            <strong>{item.data?.paidBy?.name || "Member"}</strong> added{" "}
                            <em>"{item.data?.description || "Expense"}"</em>
                          </>
                        ) : (
                          <>
                            <strong>{item.data?.from?.name || "Member"}</strong> paid{" "}
                            <strong>{item.data?.to?.name || "Member"}</strong>
                          </>
                        )}
                        {isExpense && item.data?.category && (
                          <span style={{ marginLeft: "6px" }}>
                            <CategoryTag category={item.data.category} />
                          </span>
                        )}
                      </div>
                      <div className="font-mono tabular-nums" style={{ fontSize: "11px", color: "rgba(34, 41, 31, 0.5)" }}>
                        {dateStr}
                      </div>
                    </div>
                  </div>

                  <Amount
                    value={item.data?.amount}
                    tone={isExpense ? "neutral" : "positive"}
                    style={{ fontSize: "14px" }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
