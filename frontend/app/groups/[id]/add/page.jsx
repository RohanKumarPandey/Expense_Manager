"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../../../lib/authContext";
import { apiRequest } from "../../../../lib/apiClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ErrorBanner from "../../../../components/ErrorBanner";
import Amount from "../../../../components/Amount";
import { Plus, Sparkles } from "lucide-react";

export default function AddExpensePage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Core Form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [paidBy, setPaidBy] = useState("");
  const [splitType, setSplitType] = useState("equal"); // "equal" | "unequal" | "percentage"

  // Equal split participants
  const [selectedEqualParticipants, setSelectedEqualParticipants] = useState([]);

  // Unequal split shares: { [userId]: string (rupees) }
  const [unequalShares, setUnequalShares] = useState({});

  // Percentage split: { [userId]: string (percentage) }
  const [percentages, setPercentages] = useState({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && id) {
      apiRequest(`/groups/${id}`)
        .then((res) => {
          const groupData = res.data.group;
          setGroup(groupData);
          const currentUid = (user?._id || user?.id || "").toString();
          setPaidBy(currentUid);

          const memberIds = (groupData.members || []).map((m) =>
            typeof m.user === "object" ? (m.user._id || m.user.id).toString() : m.user.toString()
          );
          setSelectedEqualParticipants(memberIds);

          // Initial unequal & percentage maps
          const initialShares = {};
          const initialPercentages = {};
          memberIds.forEach((uid) => {
            initialShares[uid] = "";
            initialPercentages[uid] = "";
          });
          setUnequalShares(initialShares);
          setPercentages(initialPercentages);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user, authLoading, id, router]);

  // Calculations for live indicators
  const parsedTotalAmount = parseFloat(amount) || 0;

  const totalUnequalEntered = useMemo(() => {
    return Object.values(unequalShares).reduce((acc, val) => {
      const num = parseFloat(val);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  }, [unequalShares]);

  const totalPercentageEntered = useMemo(() => {
    return Object.values(percentages).reduce((acc, val) => {
      const num = parseFloat(val);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  }, [percentages]);

  const isUnequalValid = useMemo(() => {
    if (parsedTotalAmount <= 0) return false;
    return Math.abs(totalUnequalEntered - parsedTotalAmount) < 0.01;
  }, [totalUnequalEntered, parsedTotalAmount]);

  const isPercentageValid = useMemo(() => {
    return Math.abs(totalPercentageEntered - 100) < 0.01;
  }, [totalPercentageEntered]);

  // Handlers for Equal split
  const handleToggleEqualParticipant = (memberId) => {
    setSelectedEqualParticipants((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((uid) => uid !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleSelectAllEqual = () => {
    if (!group?.members) return;
    const allIds = group.members.map((m) =>
      typeof m.user === "object" ? (m.user._id || m.user.id).toString() : m.user.toString()
    );
    setSelectedEqualParticipants(allIds);
  };

  // Handlers for Unequal split
  const handleUnequalChange = (userId, value) => {
    setUnequalShares((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  // Handlers for Percentage split
  const handlePercentageChange = (userId, value) => {
    setPercentages((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!parsedTotalAmount || parsedTotalAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    let payload = {
      amount: parsedTotalAmount,
      description: description.trim(),
      category,
      paidBy: paidBy || (user?._id || user?.id),
      splitType,
    };

    if (splitType === "equal") {
      if (selectedEqualParticipants.length === 0) {
        setError("Please select at least one participant for equal split.");
        return;
      }
      payload.participantIds = selectedEqualParticipants;
    } else if (splitType === "unequal") {
      const activeShares = Object.entries(unequalShares)
        .filter(([_, shareStr]) => parseFloat(shareStr) > 0)
        .map(([userId, shareStr]) => ({
          user: userId,
          share: parseFloat(shareStr),
        }));

      if (activeShares.length === 0) {
        setError("Please assign shares to at least one participant.");
        return;
      }

      if (!isUnequalValid) {
        setError(
          `Shares sum to ₹${totalUnequalEntered.toFixed(2)} but total amount is ₹${parsedTotalAmount.toFixed(2)}. They must match exactly.`
        );
        return;
      }
      payload.participantShares = activeShares;
    } else if (splitType === "percentage") {
      const activePercentages = Object.entries(percentages)
        .filter(([_, pctStr]) => parseFloat(pctStr) > 0)
        .map(([userId, pctStr]) => ({
          user: userId,
          percentage: parseFloat(pctStr),
        }));

      if (activePercentages.length === 0) {
        setError("Please assign percentages to at least one participant.");
        return;
      }

      if (!isPercentageValid) {
        setError(
          `Percentages sum to ${totalPercentageEntered.toFixed(1)}%, but must sum to exactly 100%.`
        );
        return;
      }
      payload.participantPercentages = activePercentages;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/groups/${id}/expenses`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/groups/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = useMemo(() => {
    if (submitting) return true;
    if (!parsedTotalAmount || parsedTotalAmount <= 0) return true;
    if (!description.trim()) return true;

    if (splitType === "equal") {
      return selectedEqualParticipants.length === 0;
    }
    if (splitType === "unequal") {
      return !isUnequalValid;
    }
    if (splitType === "percentage") {
      return !isPercentageValid;
    }
    return false;
  }, [
    submitting,
    parsedTotalAmount,
    description,
    splitType,
    selectedEqualParticipants,
    isUnequalValid,
    isPercentageValid,
  ]);

  if (authLoading || loading) {
    return (
      <div className="card">
        <LoadingSpinner label="Loading group members..." />
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="card">
        <ErrorBanner message={error} onRetry={() => router.refresh()} />
        <Link href={`/groups/${id}`} style={{ color: "var(--moss)", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
          ← Back to Tab
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "680px", margin: "16px auto" }}>
      <div style={{ marginBottom: "16px" }}>
        <Link
          href={`/groups/${id}`}
          style={{ color: "var(--moss)", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
        >
          ← Back to {group?.name || "Tab"}
        </Link>
      </div>

      <div className="card" style={{ marginTop: 0, padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h1 className="font-display" style={{ fontSize: "22px", margin: "0 0 2px 0" }}>Add an expense</h1>
            <span className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.6)" }}>Record a shared cost to the tab</span>
          </div>

          <Link href={`/groups/${id}/add-ai`} style={{ textDecoration: "none" }}>
            <button
              className="btn-ai"
              style={{
                width: "auto",
                padding: "6px 12px",
                fontSize: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Sparkles size={14} />
              <span>Try AI Entry</span>
            </button>
          </Link>
        </div>

        <ErrorBanner message={error} />

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div>
              <label>Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono tabular-nums"
                style={{ fontSize: "16px", fontWeight: 600 }}
              />
            </div>

            <div>
              <label>Description</label>
              <input
                type="text"
                required
                placeholder="e.g. Groceries, WiFi bill, Dinner"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div>
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="rent">Rent</option>
                <option value="groceries">Groceries</option>
                <option value="utilities">Utilities</option>
                <option value="food">Food</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label>Paid by</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                {group?.members?.map((m) => {
                  const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "Member" };
                  const memberId = (memberUser._id || memberUser.id).toString();
                  const isSelf = memberId === (user?._id || user?.id)?.toString();
                  return (
                    <option key={memberId} value={memberId}>
                      {memberUser.name} {isSelf ? "(You)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Underlined Text Tabs for Split Method */}
          <div style={{ marginTop: "12px", marginBottom: "18px" }}>
            <label>Split Method</label>
            <div
              style={{
                display: "flex",
                gap: "8px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              {[
                { id: "equal", label: "Equal (=)" },
                { id: "unequal", label: "Exact amounts (₹)" },
                { id: "percentage", label: "Percentages (%)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSplitType(tab.id)}
                  className={`tab-underlined ${splitType === tab.id ? "active" : ""}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Split Details Section */}
          <div style={{ marginBottom: "24px" }}>
            {/* Equal Split Mode */}
            {splitType === "equal" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.7)" }}>
                    Split equally among ({selectedEqualParticipants.length} selected):
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllEqual}
                    className="btn-secondary"
                    style={{ width: "auto", padding: "2px 8px", fontSize: "11px", minHeight: "26px" }}
                  >
                    Select all
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    background: "var(--paper)",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                  }}
                >
                  {group?.members?.map((m) => {
                    const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "User" };
                    const memberId = (memberUser._id || memberUser.id).toString();
                    const isChecked = selectedEqualParticipants.includes(memberId);

                    return (
                      <label
                        key={memberId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          fontSize: "13px",
                          padding: "4px 6px",
                          margin: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{ width: "auto", margin: 0, minHeight: "auto" }}
                          checked={isChecked}
                          onChange={() => handleToggleEqualParticipant(memberId)}
                        />
                        <span>
                          {memberUser.name}{" "}
                          {memberId === (user?._id || user?.id)?.toString() && (
                            <strong style={{ color: "var(--moss)" }}>(You)</strong>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Unequal Split Mode */}
            {splitType === "unequal" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.7)" }}>
                    Enter specific amount per member:
                  </span>
                  <div
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: isUnequalValid ? "var(--moss)" : "var(--rust)",
                    }}
                  >
                    <Amount value={totalUnequalEntered} tone={isUnequalValid ? "positive" : "negative"} /> / <Amount value={parsedTotalAmount} tone="neutral" />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    background: "var(--paper)",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                  }}
                >
                  {group?.members?.map((m) => {
                    const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "User" };
                    const memberId = (memberUser._id || memberUser.id).toString();

                    return (
                      <div
                        key={memberId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <span className="font-body" style={{ fontSize: "13px" }}>
                          {memberUser.name}{" "}
                          {memberId === (user?._id || user?.id)?.toString() && (
                            <strong style={{ color: "var(--moss)" }}>(You)</strong>
                          )}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span className="font-mono" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.6)" }}>₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={unequalShares[memberId] || ""}
                            onChange={(e) => handleUnequalChange(memberId, e.target.value)}
                            className="font-mono tabular-nums"
                            style={{ width: "95px", margin: 0, padding: "6px 8px", minHeight: "34px", fontSize: "13px" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isUnequalValid && parsedTotalAmount > 0 && (
                  <p className="font-body" style={{ fontSize: "12px", color: "var(--rust)", marginTop: "6px", fontWeight: 500 }}>
                    Remaining: ₹{(parsedTotalAmount - totalUnequalEntered).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Percentage Split Mode */}
            {splitType === "percentage" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.7)" }}>
                    Enter percentage share per member:
                  </span>
                  <div
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: isPercentageValid ? "var(--moss)" : "var(--rust)",
                    }}
                  >
                    {totalPercentageEntered.toFixed(1)}% / 100%
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    background: "var(--paper)",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                  }}
                >
                  {group?.members?.map((m) => {
                    const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "User" };
                    const memberId = (memberUser._id || memberUser.id).toString();

                    return (
                      <div
                        key={memberId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <span className="font-body" style={{ fontSize: "13px" }}>
                          {memberUser.name}{" "}
                          {memberId === (user?._id || user?.id)?.toString() && (
                            <strong style={{ color: "var(--moss)" }}>(You)</strong>
                          )}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={percentages[memberId] || ""}
                            onChange={(e) => handlePercentageChange(memberId, e.target.value)}
                            className="font-mono tabular-nums"
                            style={{ width: "75px", margin: 0, padding: "6px 8px", minHeight: "34px", fontSize: "13px" }}
                          />
                          <span className="font-mono" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.6)" }}>%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isPercentageValid && (
                  <p className="font-body" style={{ fontSize: "12px", color: "var(--rust)", marginTop: "6px", fontWeight: 500 }}>
                    Remaining percentage: {(100 - totalPercentageEntered).toFixed(1)}%
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="btn-primary"
            style={{ width: "100%", padding: "10px 18px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            <Plus size={16} />
            <span>{submitting ? "Adding expense..." : "Add expense"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
