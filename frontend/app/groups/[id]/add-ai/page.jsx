"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../../lib/authContext";
import { apiRequest } from "../../../../lib/apiClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function AddExpenseAIPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI Prompt State
  const [promptText, setPromptText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseNotice, setParseNotice] = useState("");

  // Mode: "prompt" | "draft" | "fallback"
  const [viewMode, setViewMode] = useState("prompt");

  // Editable Form / Draft State
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [saving, setSaving] = useState(false);

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
          const allMemberIds = (groupData.members || []).map((m) =>
            typeof m.user === "object" ? m.user._id || m.user.id : m.user
          );
          setSelectedParticipants(allMemberIds);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user, authLoading, id, router]);

  const samplePrompts = [
    "Dinner for 1200 with everyone",
    "Groceries 850 split with flatmates",
    "Monthly WiFi bill 1500",
    "Cab to airport 450",
  ];

  const handleParseAI = async (e) => {
    if (e) e.preventDefault();
    if (!promptText.trim()) {
      setError("Please describe the expense first.");
      return;
    }

    setError("");
    setParseNotice("");
    setParsing(true);

    try {
      const res = await apiRequest(`/groups/${id}/ai/parse-expense`, {
        method: "POST",
        body: JSON.stringify({ text: promptText.trim() }),
      });

      if (res.data && res.data.success) {
        const draft = res.data.draftExpense;
        setAmount(draft.amount.toString());
        setDescription(draft.description);
        setCategory(draft.category || "other");
        setSelectedParticipants(
          draft.participantIds && draft.participantIds.length > 0
            ? draft.participantIds
            : group?.members?.map((m) =>
                typeof m.user === "object" ? m.user._id || m.user.id : m.user
              ) || []
        );
        setViewMode("draft");
      } else {
        // AI parse failed gracefully — switch to fallback manual form
        setParseNotice(
          res.data?.reason || "Could not parse the expense automatically."
        );
        setDescription(promptText.trim());
        setAmount("");
        setCategory("other");
        setViewMode("fallback");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleToggleParticipant = (memberId) => {
    setSelectedParticipants((prev) =>
      prev.includes(memberId)
        ? prev.filter((uid) => uid !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAllParticipants = () => {
    if (!group?.members) return;
    const allIds = group.members.map((m) =>
      typeof m.user === "object" ? m.user._id || m.user.id : m.user
    );
    setSelectedParticipants(allIds);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (selectedParticipants.length === 0) {
      setError("Please select at least one participant.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest(`/groups/${id}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          amount: parsedAmount,
          description: description.trim(),
          category,
          splitType: "equal",
          participantIds: selectedParticipants,
          source: viewMode === "draft" ? "ai" : "manual",
        }),
      });
      router.push(`/groups/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setViewMode("prompt");
    setAmount("");
    setDescription("");
    setCategory("other");
    setError("");
    setParseNotice("");
  };

  if (authLoading || loading) {
    return <div className="card">Loading group members...</div>;
  }

  if (error && !group) {
    return (
      <div className="card">
        <div className="error-message">{error}</div>
        <Link href={`/groups/${id}`} style={{ color: "#2563eb" }}>
          ← Back to Group
        </Link>
      </div>
    );
  }

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

      <div className="card" style={{ marginTop: 0 }}>
        <div style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "24px" }}>🤖</span>
            <h1 style={{ fontSize: "22px", margin: 0 }}>Add Expense with AI</h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
            Describe your expense in natural language. Our AI will draft the details for your review before saving.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* View Mode 1: Natural Language Prompt Input */}
        {viewMode === "prompt" && (
          <div>
            <form onSubmit={handleParseAI}>
              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "6px",
                    color: "#374151",
                  }}
                >
                  Describe the expense:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Paid ₹1200 for groceries and snacks at supermarket for everyone"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Sample Prompts */}
              <div style={{ marginBottom: "18px" }}>
                <span style={{ fontSize: "12px", color: "#6b7280", marginRight: "6px" }}>
                  💡 Try an example:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {samplePrompts.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPromptText(sample)}
                      style={{
                        width: "auto",
                        padding: "4px 8px",
                        fontSize: "12px",
                        backgroundColor: "#f3f4f6",
                        color: "#374151",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={parsing || !promptText.trim()}
                  style={{
                    backgroundColor: parsing || !promptText.trim() ? "#93c5fd" : "#2563eb",
                    cursor: parsing || !promptText.trim() ? "not-allowed" : "pointer",
                    padding: "10px 16px",
                    fontWeight: 600,
                  }}
                >
                  {parsing ? "✨ Parsing with AI..." : "✨ Parse with AI"}
                </button>
                <Link href={`/groups/${id}/add`} style={{ flex: 1 }}>
                  <button
                    type="button"
                    style={{
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      padding: "10px 16px",
                    }}
                  >
                    Manual Form
                  </button>
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* View Mode 2 & 3: Draft Review or Fallback Manual Entry */}
        {(viewMode === "draft" || viewMode === "fallback") && (
          <div>
            {/* Context Notice */}
            {viewMode === "draft" ? (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  marginBottom: "18px",
                  fontSize: "13px",
                  color: "#1e40af",
                  lineHeight: "1.4",
                }}
              >
                ✨ <strong>AI Draft Generated:</strong> Please review and adjust the parsed details below. The expense is only saved when you click <strong>Confirm & Save</strong>.
              </div>
            ) : (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  marginBottom: "18px",
                  fontSize: "13px",
                  color: "#92400e",
                  lineHeight: "1.4",
                }}
              >
                💡 <strong>Couldn't parse automatically:</strong> {parseNotice || "Please fill in the remaining details below to record this expense."}
              </div>
            )}

            <form onSubmit={handleSaveExpense}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
                  Total Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 1200.00"
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
                  placeholder="e.g. Groceries and snacks"
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

              {/* Equal Split Participants */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 500 }}>
                    Split equally among ({selectedParticipants.length} selected):
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllParticipants}
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

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    background: "#f9fafb",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {group?.members?.map((m) => {
                    const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "User" };
                    const memberId = memberUser._id || memberUser.id;
                    const isChecked = selectedParticipants.includes(memberId);

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
                          onChange={() => handleToggleParticipant(memberId)}
                        />
                        <span>
                          {memberUser.name}{" "}
                          {memberId === (user?._id || user?.id) && (
                            <span style={{ color: "#2563eb", fontSize: "12px" }}>(You)</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={saving || !parseFloat(amount) || selectedParticipants.length === 0}
                  style={{
                    flex: 2,
                    backgroundColor:
                      saving || !parseFloat(amount) || selectedParticipants.length === 0
                        ? "#93c5fd"
                        : "#2563eb",
                    cursor:
                      saving || !parseFloat(amount) || selectedParticipants.length === 0
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: 600,
                  }}
                >
                  {saving ? "Saving Expense..." : "Confirm & Save Expense"}
                </button>
                <button
                  type="button"
                  onClick={handleDiscard}
                  style={{
                    flex: 1,
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                  }}
                >
                  Discard
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
