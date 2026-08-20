"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../../lib/authContext";
import { apiRequest } from "../../../../lib/apiClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function AddExpensePage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [selectedParticipants, setSelectedParticipants] = useState([]);

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
          // Default: all members checked
          const memberIds = (groupData.members || []).map((m) =>
            typeof m.user === "object" ? m.user._id || m.user.id : m.user
          );
          setSelectedParticipants(memberIds);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user, authLoading, id, router]);

  const handleToggleParticipant = (memberId) => {
    setSelectedParticipants((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((uid) => uid !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleSelectAll = () => {
    if (!group?.members) return;
    const allIds = group.members.map((m) =>
      typeof m.user === "object" ? m.user._id || m.user.id : m.user
    );
    setSelectedParticipants(allIds);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid amount greater than zero.");
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

    setSubmitting(true);
    try {
      await apiRequest(`/groups/${id}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          amount: numAmount,
          description: description.trim(),
          category,
          participantIds: selectedParticipants,
        }),
      });
      router.push(`/groups/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <div className="card">Loading group members...</div>;
  }

  if (error && !group) {
    return (
      <div className="card">
        <div className="error-message">{error}</div>
        <Link href={`/groups/${id}`} style={{ color: "#2563eb" }}>← Back to Group</Link>
      </div>
    );
  }

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
              Amount (₹)
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

          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500 }}>
                Split Equally Among ({selectedParticipants.length} selected):
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
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
                      {memberId === (user?._id || user?.id) && <span style={{ color: "#2563eb", fontSize: "12px" }}>(You)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? "Saving Expense..." : "Save Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}
