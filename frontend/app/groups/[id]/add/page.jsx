"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../../../lib/authContext";
import { apiRequest } from "../../../../lib/apiClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ErrorBanner from "../../../../components/ErrorBanner";

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
            typeof m.user === "object" ? m.user._id || m.user.id : m.user
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
      typeof m.user === "object" ? m.user._id || m.user.id : m.user
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
      setError("Please enter a valid amount greater than zero.");
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
        <Link href={`/groups/${id}`} style={{ color: "#2563eb", textDecoration: "none", fontSize: "14px" }}>
          ← Back to Group
        </Link>
      </div>
    );
  }

  const isSubmitDisabled =
    submitting ||
    !parsedTotalAmount ||
    (splitType === "equal" && selectedEqualParticipants.length === 0) ||
    (splitType === "unequal" && !isUnequalValid) ||
    (splitType === "percentage" && !isPercentageValid);

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <Link href={`/groups/${id}`} style={{ color: "#2563eb", fontSize: "14px", textDecoration: "none" }}>
          ← Back to {group?.name || "Group"}
        </Link>
      </div>

      <div className="card" style={{ marginTop: 0 }}>
        <h1 style={{ fontSize: "22px", marginBottom: "16px" }}>Add Expense</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
              Total Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="e.g. 300.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
              Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wi-Fi bill, Groceries, Dinner"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                backgroundColor: "#fff",
              }}
            >
              <option value="rent">Rent</option>
              <option value="groceries">Groceries</option>
              <option value="utilities">Utilities</option>
              <option value="food">Food</option>
              <option value="travel">Travel</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
              Paid By
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                backgroundColor: "#fff",
              }}
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

          {/* Split Type Selector */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
              Split Method
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { id: "equal", label: "Equal (=)" },
                { id: "unequal", label: "Unequal (₹)" },
                { id: "percentage", label: "Percentage (%)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSplitType(tab.id)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    backgroundColor: splitType === tab.id ? "#2563eb" : "#f3f4f6",
                    color: splitType === tab.id ? "#ffffff" : "#374151",
                    border: splitType === tab.id ? "1px solid #2563eb" : "1px solid #e5e7eb",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Split Details Section */}
          <div style={{ marginBottom: "20px" }}>
            {/* Equal Split Mode */}
            {splitType === "equal" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 500 }}>
                    Split equally among ({selectedEqualParticipants.length} selected):
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllEqual}
                    style={{
                      width: "auto",
                      padding: "2px 8px",
                      fontSize: "12px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    Select All
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "#f9fafb", padding: "12px", borderRadius: "6px" }}>
                  {group?.members?.map((m) => {
                    const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "User" };
                    const memberId = memberUser._id || memberUser.id;
                    const isChecked = selectedEqualParticipants.includes(memberId);

                    return (
                      <label
                        key={memberId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{ width: "auto", margin: 0 }}
                          checked={isChecked}
                          onChange={() => handleToggleEqualParticipant(memberId)}
                        />
                        <span>
                          {memberUser.name}{" "}
                          {memberId === (user?._id || user?.id) && <span style={{ color: "#2563eb", fontSize: "12px" }}>(You)</span>}
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
                  <label style={{ fontSize: "14px", fontWeight: 500 }}>Enter specific amount per member:</label>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: isUnequalValid ? "#dcfce7" : "#fee2e2",
                      color: isUnequalValid ? "#166534" : "#991b1b",
                    }}
                  >
                    ₹{totalUnequalEntered.toFixed(2)} / ₹{parsedTotalAmount.toFixed(2)}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "#f9fafb", padding: "12px", borderRadius: "6px" }}>
                  {group?.members?.map((m) => {
                    const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "User" };
                    const memberId = memberUser._id || memberUser.id;

                    return (
                      <div
                        key={memberId}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}
                      >
                        <span style={{ fontSize: "14px", flex: 1 }}>
                          {memberUser.name}{" "}
                          {memberId === (user?._id || user?.id) && <span style={{ color: "#2563eb", fontSize: "12px" }}>(You)</span>}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "14px", color: "#6b7280" }}>₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={unequalShares[memberId] || ""}
                            onChange={(e) => handleUnequalChange(memberId, e.target.value)}
                            style={{ width: "100px", margin: 0, padding: "6px 8px", fontSize: "13px" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isUnequalValid && parsedTotalAmount > 0 && (
                  <p style={{ fontSize: "12px", color: "#dc2626", marginTop: "6px" }}>
                    Remaining difference: ₹{(parsedTotalAmount - totalUnequalEntered).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Percentage Split Mode */}
            {splitType === "percentage" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 500 }}>Enter percentage share per member:</label>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: isPercentageValid ? "#dcfce7" : "#fee2e2",
                      color: isPercentageValid ? "#166534" : "#991b1b",
                    }}
                  >
                    {totalPercentageEntered.toFixed(1)}% / 100%
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "#f9fafb", padding: "12px", borderRadius: "6px" }}>
                  {group?.members?.map((m) => {
                    const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "User" };
                    const memberId = memberUser._id || memberUser.id;

                    return (
                      <div
                        key={memberId}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}
                      >
                        <span style={{ fontSize: "14px", flex: 1 }}>
                          {memberUser.name}{" "}
                          {memberId === (user?._id || user?.id) && <span style={{ color: "#2563eb", fontSize: "12px" }}>(You)</span>}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={percentages[memberId] || ""}
                            onChange={(e) => handlePercentageChange(memberId, e.target.value)}
                            style={{ width: "80px", margin: 0, padding: "6px 8px", fontSize: "13px" }}
                          />
                          <span style={{ fontSize: "14px", color: "#6b7280" }}>%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isPercentageValid && (
                  <p style={{ fontSize: "12px", color: "#dc2626", marginTop: "6px" }}>
                    Remaining percentage: {(100 - totalPercentageEntered).toFixed(1)}%
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            style={{
              backgroundColor: isSubmitDisabled ? "#93c5fd" : "#2563eb",
              cursor: isSubmitDisabled ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Saving Expense..." : "Save Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}
