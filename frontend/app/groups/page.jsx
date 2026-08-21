"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/authContext";
import { apiRequest } from "../../lib/apiClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBanner from "../../components/ErrorBanner";
import EmptyState from "../../components/EmptyState";

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Join form state
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiRequest("/groups");
      setGroups(res.data.groups || []);
    } catch (err) {
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      fetchGroups();
    }
  }, [user, authLoading, router]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);

    try {
      await apiRequest("/groups", {
        method: "POST",
        body: JSON.stringify({ name: createName, description: createDesc }),
      });
      setCreateName("");
      setCreateDesc("");
      setSuccess("Group created successfully!");
      fetchGroups();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setJoining(true);

    try {
      await apiRequest("/groups/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: joinCode }),
      });
      setJoinCode("");
      setSuccess("Joined group successfully!");
      fetchGroups();
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>My Groups</h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link
            href="/dashboard"
            style={{
              color: "#059669",
              fontSize: "14px",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            📊 Dashboard
          </Link>
          <Link href="/" style={{ color: "#2563eb", fontSize: "14px", textDecoration: "none" }}>
            ← Home
          </Link>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={fetchGroups} />

      {success && (
        <div
          style={{
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "10px 14px",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          ✓ {success}
        </div>
      )}

      {/* Forms Grid — Responsive 2 cols on tablet/desktop, 1 col on mobile */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        {/* Create Group Form */}
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
            ➕ Create a Group
          </h2>
          <form onSubmit={handleCreateGroup}>
            <input
              type="text"
              required
              placeholder="Group Name (e.g. 221B Baker Street)"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
            />
            <button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Group"}
            </button>
          </form>
        </div>

        {/* Join Group Form */}
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
            🔗 Join a Group
          </h2>
          <form onSubmit={handleJoinGroup}>
            <input
              type="text"
              required
              placeholder="Enter 6-char Invite Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button type="submit" disabled={joining} style={{ backgroundColor: "#059669" }}>
              {joining ? "Joining..." : "Join Group"}
            </button>
          </form>
        </div>
      </div>

      {/* Group List */}
      <div>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "14px" }}>
          Your Groups {!loading && `(${groups.length})`}
        </h2>

        {authLoading || loading ? (
          <div className="card" style={{ marginTop: 0 }}>
            <LoadingSpinner label="Loading your groups..." />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No groups yet"
            description="You aren't a member of any flatmate group yet. Create your first group or join an existing one using an invite code above!"
          />
        ) : (
          groups.map((group) => (
            <div key={group._id} className="card" style={{ marginTop: "12px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 4px 0" }}>
                    <Link
                      href={`/groups/${group._id}`}
                      style={{ textDecoration: "none", color: "#111827" }}
                    >
                      {group.name}
                    </Link>
                  </h3>
                  {group.description && (
                    <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 8px 0" }}>
                      {group.description}
                    </p>
                  )}
                  <p style={{ fontSize: "13px", color: "#4b5563", margin: 0 }}>
                    Members: <strong>{group.members ? group.members.length : 0}</strong> | Invite Code:{" "}
                    <code
                      style={{
                        background: "#e5e7eb",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 700,
                      }}
                    >
                      {group.inviteCode}
                    </code>
                  </p>
                </div>
                <Link href={`/groups/${group._id}`}>
                  <button
                    style={{
                      width: "auto",
                      padding: "8px 16px",
                      fontSize: "13px",
                      minHeight: "44px",
                    }}
                  >
                    View Group →
                  </button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
