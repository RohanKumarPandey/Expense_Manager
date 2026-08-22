"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../lib/authContext";
import { apiRequest } from "../../../lib/apiClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ErrorBanner from "../../../components/ErrorBanner";
import EmptyState from "../../../components/EmptyState";
import RunningTabCard from "../../../components/RunningTabCard";
import ExpenseRow from "../../../components/ExpenseRow";
import {
  Receipt,
  Plus,
  Sparkles,
  Handshake,
  Users,
  Copy,
  Check,
  Trash2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Balances state
  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Filter, Sort & Search state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Expenses pagination state
  const [expenses, setExpenses] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expensesLoading, setExpensesLoading] = useState(false);

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
      setBalances(res.data.netBalances || []);
    } catch (err) {
      console.error("Failed to load balances:", err);
    } finally {
      setBalancesLoading(false);
    }
  }, [id]);

  const fetchExpenses = useCallback(
    async (currentPage = 1, search = "", category = "", sort = "date", order = "desc") => {
      try {
        setExpensesLoading(true);
        const queryParams = new URLSearchParams();
        queryParams.set("page", currentPage.toString());
        queryParams.set("limit", "10");
        if (search) queryParams.set("search", search);
        if (category) queryParams.set("category", category);
        if (sort) queryParams.set("sortBy", sort);
        if (order) queryParams.set("order", order);

        const res = await apiRequest(`/groups/${id}/expenses?${queryParams.toString()}`);
        setExpenses(res.data.expenses || []);
        setPage(res.data.pagination.page);
        setTotalPages(res.data.pagination.totalPages);
        setTotalExpenses(res.data.pagination.total);
      } catch (err) {
        console.error("Failed to fetch expenses:", err);
      } finally {
        setExpensesLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && id) {
      fetchGroupDetail();
      fetchBalances();
    }
  }, [user, authLoading, id, router, fetchGroupDetail, fetchBalances]);

  useEffect(() => {
    if (user && id) {
      fetchExpenses(page, debouncedSearch, categoryFilter, sortBy, sortOrder);
    }
  }, [user, id, page, debouncedSearch, categoryFilter, sortBy, sortOrder, fetchExpenses]);

  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCategoryFilter("");
    setSortBy("date");
    setSortOrder("desc");
    setPage(1);
  };

  const [deletingGroup, setDeletingGroup] = useState(false);

  const handleDeleteGroup = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${group?.name}"? All expenses and settlements will be permanently removed.`
      )
    ) {
      return;
    }
    setError("");
    setDeletingGroup(true);
    try {
      await apiRequest(`/groups/${id}`, { method: "DELETE" });
      router.push("/groups");
    } catch (err) {
      setError(err.message);
      setDeletingGroup(false);
    }
  };

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
      fetchExpenses(page, debouncedSearch, categoryFilter, sortBy, sortOrder);
      fetchBalances();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopyCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="card">
        <LoadingSpinner label="Opening household tab..." />
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="card">
        <ErrorBanner message={error} onRetry={fetchGroupDetail} />
        <Link href="/groups" style={{ color: "var(--moss)", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
          ← Back to Groups
        </Link>
      </div>
    );
  }

  const currentUserId = (user?._id || user?.id || "").toString();
  const currentMember = group?.members?.find(
    (m) => (m.user?._id || m.user?.id || m.user || "").toString() === currentUserId
  );
  const isAdmin =
    currentMember?.role === "admin" ||
    (group?.createdBy?._id || group?.createdBy?.id || group?.createdBy || "").toString() === currentUserId;

  const hasActiveFilters = Boolean(searchInput || categoryFilter || sortBy !== "date" || sortOrder !== "desc");

  return (
    <div>
      {/* Top Breadcrumbs */}
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Link href="/groups" style={{ color: "var(--moss)", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
          ← All Household Tabs
        </Link>
        <Link
          href={`/groups/${id}/settle`}
          style={{
            color: "var(--mustard)",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Handshake size={14} />
          <span>Settle Up →</span>
        </Link>
      </div>

      <ErrorBanner message={error} />
      {actionMessage && (
        <div className="success-message">
          <Check size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Header & Meta Card */}
      <div className="card" style={{ marginTop: 0, padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <h1 className="font-display" style={{ fontSize: "26px", margin: 0, color: "var(--ink)" }}>
                {group.name}
              </h1>
              {isAdmin && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    backgroundColor: "rgba(79, 107, 74, 0.15)",
                    color: "var(--moss)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  Admin
                </span>
              )}
            </div>

            {group.description && (
              <p className="font-body" style={{ color: "rgba(34, 41, 31, 0.7)", fontSize: "14px", margin: "0 0 10px 0" }}>
                {group.description}
              </p>
            )}

            {/* Invite Code Tag with Lucide Copy/Check */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--paper)", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}>
              <span className="font-body" style={{ fontSize: "12px", color: "rgba(34, 41, 31, 0.65)" }}>Invite Code:</span>
              <button
                onClick={handleCopyCode}
                className="btn-secondary"
                style={{
                  width: "auto",
                  minHeight: "auto",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  backgroundColor: "rgba(201, 154, 46, 0.15)",
                  color: "var(--mustard)",
                  border: "1px solid rgba(201, 154, 46, 0.3)",
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "1px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Click to copy invite code"
              >
                <span>{group.inviteCode}</span>
                {copiedCode ? <Check size={12} style={{ color: "var(--moss)" }} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Link href={`/groups/${id}/add`} style={{ textDecoration: "none" }}>
              <button
                className="btn-primary"
                style={{
                  width: "auto",
                  padding: "8px 14px",
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Plus size={15} />
                <span>Add expense</span>
              </button>
            </Link>
            <Link href={`/groups/${id}/add-ai`} style={{ textDecoration: "none" }}>
              <button
                className="btn-ai"
                style={{
                  width: "auto",
                  padding: "8px 14px",
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={15} />
                <span>Add with AI</span>
              </button>
            </Link>
            {isAdmin && (
              <button
                onClick={handleDeleteGroup}
                disabled={deletingGroup}
                className="btn-destructive"
                style={{
                  width: "auto",
                  padding: "8px 12px",
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Trash2 size={13} />
                <span>{deletingGroup ? "Deleting..." : "Delete Tab"}</span>
              </button>
            )}
            <button
              onClick={handleLeaveGroup}
              className="btn-secondary"
              style={{
                width: "auto",
                padding: "8px 12px",
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <LogOut size={13} />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Member list line */}
        <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              className="font-body"
              style={{
                fontSize: "12px",
                color: "rgba(34, 41, 31, 0.6)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Users size={13} />
              MEMBERS ({group.members?.length || 0}):
            </span>
            {group.members?.map((m) => {
              const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "User", email: "" };
              const memberId = memberUser._id || memberUser.id;
              const isSelf = memberId === currentUserId;

              return (
                <span
                  key={memberId}
                  className="font-body"
                  style={{
                    fontSize: "12px",
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    color: "var(--ink)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {memberUser.name} {isSelf && <strong style={{ color: "var(--moss)" }}>(You)</strong>}
                  {isAdmin && !isSelf && (
                    <span
                      onClick={() => handleRemoveMember(memberId, memberUser.name)}
                      style={{ cursor: "pointer", color: "var(--rust)", marginLeft: "2px", fontWeight: 700 }}
                      title="Remove member"
                    >
                      ×
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Signature Element: The Running Tab Card (Fix 2) */}
      <div style={{ marginTop: "20px" }}>
        {balancesLoading ? (
          <div className="card">
            <LoadingSpinner label="Tallying balances on running tab..." />
          </div>
        ) : (
          <RunningTabCard
            title={`${group.name} — Running Tab`}
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
        )}
      </div>

      {/* Receipt-Style Expense Log Container (Fix 4) */}
      <div className="card" style={{ marginTop: "20px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Receipt size={16} style={{ color: "rgba(34, 41, 31, 0.5)" }} />
            <div>
              <h2 className="font-display" style={{ fontSize: "19px", margin: 0 }}>
                Expenses ({totalExpenses})
              </h2>
            </div>
          </div>

          <Link href={`/groups/${id}/settle`} style={{ textDecoration: "none" }}>
            <button
              className="btn-secondary"
              style={{
                width: "auto",
                padding: "6px 12px",
                fontSize: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Handshake size={13} />
              <span>Settle Up Tab</span>
            </button>
          </Link>
        </div>

        {/* Filter & Search Toolbar */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "18px",
            flexWrap: "wrap",
            alignItems: "center",
            background: "var(--paper)",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid var(--line)",
          }}
        >
          <div style={{ flex: "2 1 180px" }}>
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ margin: 0, minHeight: "36px", padding: "6px 10px", fontSize: "13px" }}
            />
          </div>

          <div style={{ flex: "1 1 120px" }}>
            <select
              value={categoryFilter}
              onChange={(e) => handleFilterChange(setCategoryFilter)(e.target.value)}
              style={{ margin: 0, minHeight: "36px", padding: "6px 10px", fontSize: "13px" }}
            >
              <option value="">All categories</option>
              <option value="rent">Rent</option>
              <option value="groceries">Groceries</option>
              <option value="utilities">Utilities</option>
              <option value="food">Food</option>
              <option value="travel">Travel</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ flex: "1 1 110px" }}>
            <select
              value={sortBy}
              onChange={(e) => handleFilterChange(setSortBy)(e.target.value)}
              style={{ margin: 0, minHeight: "36px", padding: "6px 10px", fontSize: "13px" }}
            >
              <option value="date">Sort: Date</option>
              <option value="amount">Sort: Amount</option>
            </select>
          </div>

          <div>
            <button
              onClick={() => handleFilterChange(setSortOrder)(sortOrder === "desc" ? "asc" : "desc")}
              className="btn-secondary"
              style={{ width: "auto", padding: "6px 10px", fontSize: "12px", minHeight: "36px" }}
            >
              {sortOrder === "desc" ? "↓ Newest" : "↑ Oldest"}
            </button>
          </div>

          {hasActiveFilters && (
            <div>
              <button
                onClick={handleResetFilters}
                className="btn-destructive"
                style={{ width: "auto", padding: "6px 10px", fontSize: "12px", minHeight: "36px" }}
              >
                ✕ Reset
              </button>
            </div>
          )}
        </div>

        {/* Receipt Expense Rows via ExpenseRow component */}
        {expensesLoading ? (
          <LoadingSpinner label="Fetching itemized ledger..." />
        ) : expenses.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              title="No items matched"
              description="No expenses found matching your filter criteria."
              action={
                <button onClick={handleResetFilters} className="btn-secondary" style={{ width: "auto", padding: "6px 14px", fontSize: "13px" }}>
                  Clear filter
                </button>
              }
            />
          ) : (
            <EmptyState
              title="No expenses yet"
              description="Add the first one to start the tab."
              action={
                <Link href={`/groups/${id}/add`} style={{ textDecoration: "none" }}>
                  <button className="btn-primary" style={{ width: "auto", padding: "8px 16px", fontSize: "13px" }}>
                    Add first expense
                  </button>
                </Link>
              }
            />
          )
        ) : (
          <div>
            {expenses.map((exp) => (
              <ExpenseRow
                key={exp._id}
                expense={exp}
                groupId={id}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onDelete={handleDeleteExpense}
              />
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 0 0 0",
                  marginTop: "8px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div className="font-mono tabular-nums" style={{ fontSize: "12px", color: "rgba(34, 41, 31, 0.6)" }}>
                  Page {page} of {totalPages} ({totalExpenses} entries)
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || expensesLoading}
                    className="btn-secondary"
                    style={{
                      width: "auto",
                      padding: "4px 10px",
                      fontSize: "12px",
                      minHeight: "30px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ChevronLeft size={13} />
                    <span>Prev</span>
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || expensesLoading}
                    className="btn-secondary"
                    style={{
                      width: "auto",
                      padding: "4px 10px",
                      fontSize: "12px",
                      minHeight: "30px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
