"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/authContext";
import { apiRequest } from "../../lib/apiClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
      const res = await apiRequest("/groups");
      setGroups(res.data.groups || []);
    } catch (err) {
      setError(err.message);
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

  if (authLoading || loading) {
    return <div className="card">Loading groups...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px" }}>My Groups</h1>
        <Link href="/" style={{ color: "#2563eb", fontSize: "14px" }}>← Home</Link>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        {/* Create Group Form */}
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>Create a Group</h2>
          <form onSubmit={handleCreateGroup}>
            <input
              type="text"
              required
              placeholder="Group Name"
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
          <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>Join a Group</h2>
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
        <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>Your Groups ({groups.length})</h2>
        {groups.length === 0 ? (
          <div className="card">You aren't a member of any group yet. Create or join one above!</div>
        ) : (
          groups.map((group) => (
            <div key={group._id} className="card" style={{ marginTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "18px" }}>
                    <Link href={`/groups/${group._id}`} style={{ textDecoration: "none", color: "#111827" }}>
                      {group.name}
                    </Link>
                  </h3>
                  {group.description && (
                    <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>{group.description}</p>
                  )}
                  <p style={{ fontSize: "13px", color: "#4b5563", marginTop: "8px" }}>
                    Members: {group.members ? group.members.length : 0} | Invite Code: <strong>{group.inviteCode}</strong>
                  </p>
                </div>
                <Link href={`/groups/${group._id}`}>
                  <button style={{ width: "auto", padding: "6px 12px", fontSize: "13px" }}>View Group</button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
