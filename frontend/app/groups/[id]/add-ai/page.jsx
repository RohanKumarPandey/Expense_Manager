"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../../lib/authContext";
import { apiRequest } from "../../../../lib/apiClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ErrorBanner from "../../../../components/ErrorBanner";
import { Sparkles, Check, RotateCcw, FileText } from "lucide-react";

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
  const [paidBy, setPaidBy] = useState("");
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
          const currentUid = (user?._id || user?.id || "").toString();
          setPaidBy(currentUid);
          const allMemberIds = (groupData.members || []).map((m) =>
            (typeof m.user === "object" ? m.user._id || m.user.id : m.user).toString()
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
        if (draft.paidById) {
          setPaidBy(draft.paidById);
        }
        setSelectedParticipants(
          draft.participantIds && draft.participantIds.length > 0
            ? draft.participantIds
            : group?.members?.map((m) =>
                (typeof m.user === "object" ? m.user._id || m.user.id : m.user).toString()
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
        setPaidBy((user?._id || user?.id || "").toString());
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
      (typeof m.user === "object" ? m.user._id || m.user.id : m.user).toString()
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
          paidBy: paidBy || (user?._id || user?.id),
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

  const handleResetPrompt = () => {
    setViewMode("prompt");
    setAmount("");
    setDescription("");
    setCategory("other");
    setPaidBy((user?._id || user?.id || "").toString());
    setError("");
    setParseNotice("");
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h1 className="font-display" style={{ fontSize: "22px", margin: "0 0 2px 0" }}>
              Add with natural language
            </h1>
            <span className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.65)" }}>
              AI drafts the item — you review and confirm before it hits the tab
            </span>
          </div>
          <span
            className="font-mono tabular-nums"
            style={{
              fontSize: "11px",
              padding: "3px 8px",
              background: "rgba(201, 154, 46, 0.15)",
              color: "var(--mustard)",
              borderRadius: "4px",
              fontWeight: 700,
              border: "1px solid rgba(201, 154, 46, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Sparkles size={12} />
            <span>AI ASSISTED</span>
          </span>
        </div>

        <ErrorBanner message={error} />

        {/* View Mode 1: AI Prompt Input */}
        {viewMode === "prompt" && (
          <div>
            <p className="font-body" style={{ fontSize: "14px", color: "rgba(34, 41, 31, 0.75)", marginBottom: "14px" }}>
              Type an expense in plain English, Hindi, or Hinglish:
            </p>

            <form onSubmit={handleParseAI}>
              <div style={{ marginBottom: "14px" }}>
                <textarea
                  rows={3}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder='e.g. "Rohan Pandey paid 1200 for dinner" or "Maine 600 rupaye snacks ke bhare"'
                  className="ai-textarea"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "'Inter', sans-serif",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Sample Prompts */}
              <div style={{ marginBottom: "20px" }}>
                <span className="font-body" style={{ fontSize: "12px", color: "rgba(34, 41, 31, 0.6)", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  💡 Examples:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {samplePrompts.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPromptText(sample)}
                      className="btn-secondary"
                      style={{
                        width: "auto",
                        padding: "3px 8px",
                        fontSize: "12px",
                        borderRadius: "4px",
                        minHeight: "26px",
                      }}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={parsing || !promptText.trim()}
                  className="btn-ai"
                  style={{
                    flex: "2 1 180px",
                    padding: "10px 18px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Sparkles size={15} />
                  <span>{parsing ? "Parsing text..." : "Parse into draft"}</span>
                </button>
                <Link href={`/groups/${id}/add`} style={{ flex: "1 1 140px", textDecoration: "none" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{
                      width: "100%",
                      padding: "10px 18px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <FileText size={15} />
                    <span>Manual form</span>
                  </button>
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* View Mode 2 & 3: Draft Review or Fallback Manual Entry */}
        {(viewMode === "draft" || viewMode === "fallback") && (
          <div>
            {/* Context Notice Box in Mustard */}
            {viewMode === "draft" ? (
              <div className="ai-draft-box" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} style={{ color: "var(--mustard)", flexShrink: 0 }} />
                <span>
                  <strong>AI Draft:</strong> Review the extracted details below. The item is only added to the running tab when you click <strong>Confirm and save</strong>.
                </span>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(201, 154, 46, 0.1)",
                  border: "1px solid rgba(201, 154, 46, 0.3)",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  marginBottom: "18px",
                  fontSize: "13px",
                  color: "var(--ink)",
                  lineHeight: "1.4",
                }}
              >
                💡 {parseNotice || "Please fill in the remaining details below to record this expense."}
              </div>
            )}

            <form onSubmit={handleSaveExpense}>
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
                    placeholder="e.g. Groceries and snacks"
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

                {/* Paid By Selector */}
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

              {/* Equal Split Participants */}
              <div style={{ marginBottom: "24px", marginTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.7)" }}>
                    Split equally among ({selectedParticipants.length} selected):
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllParticipants}
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
                    const isChecked = selectedParticipants.includes(memberId);

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
                          onChange={() => handleToggleParticipant(memberId)}
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

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={saving || !parseFloat(amount) || selectedParticipants.length === 0}
                  className="btn-primary"
                  style={{
                    flex: "2 1 180px",
                    padding: "10px 18px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Check size={16} />
                  <span>{saving ? "Adding to tab..." : "Confirm and save"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetPrompt}
                  className="btn-secondary"
                  style={{
                    flex: "1 1 140px",
                    padding: "10px 18px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Try again</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
