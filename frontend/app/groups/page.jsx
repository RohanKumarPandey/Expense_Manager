"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/authContext";
import { apiRequest } from "../../lib/apiClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBanner from "../../components/ErrorBanner";
import EmptyState from "../../components/EmptyState";
import GroupCard from "../../components/GroupCard";
import { LayoutDashboard, Plus, UserPlus, Check } from "lucide-react";

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
      {/* Page Header in Fraunces */}
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
            Household Tabs
          </h1>
          <p className="font-body" style={{ color: "rgba(34, 41, 31, 0.65)", fontSize: "14px", margin: 0 }}>
            Shared ledgers with flatmates and roommates
          </p>
        </div>

        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <button
            className="btn-secondary"
            style={{
              width: "auto",
              padding: "6px 14px",
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <LayoutDashboard size={15} style={{ color: "var(--moss)" }} />
            <span>Open Dashboard</span>
          </button>
        </Link>
      </div>

      <ErrorBanner message={error} onRetry={fetchGroups} />

      {success && (
        <div className="success-message">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Forms Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {/* Create Group Form */}
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <Plus size={16} style={{ color: "var(--moss)" }} />
            <h2 className="font-display" style={{ fontSize: "17px", margin: 0 }}>
              Create a New Tab
            </h2>
          </div>
          <p className="font-body" style={{ fontSize: "12px", color: "rgba(34, 41, 31, 0.6)", marginBottom: "14px" }}>
            Start a ledger for a new apartment or household
          </p>

          <form onSubmit={handleCreateGroup}>
            <div>
              <label>Tab / Group Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Flat 302, 221B Baker St"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div>
              <label>Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Rent, groceries, utilities"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
              />
            </div>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? "Creating Tab..." : "Create Tab"}
            </button>
          </form>
        </div>

        {/* Join Group Form */}
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <UserPlus size={16} style={{ color: "var(--mustard)" }} />
            <h2 className="font-display" style={{ fontSize: "17px", margin: 0 }}>
              Join an Existing Tab
            </h2>
          </div>
          <p className="font-body" style={{ fontSize: "12px", color: "rgba(34, 41, 31, 0.6)", marginBottom: "14px" }}>
            Enter the 6-character invite code from a flatmate
          </p>

          <form onSubmit={handleJoinGroup}>
            <div>
              <label>Invite Code</label>
              <input
                type="text"
                required
                placeholder="e.g. FLAT01"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono tabular-nums"
                style={{ textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700 }}
              />
            </div>
            <div style={{ height: "66px", display: "flex", alignItems: "center", color: "rgba(34, 41, 31, 0.6)", fontSize: "13px" }}>
              Ask any existing member of your flatmate group for their 6-character code.
            </div>
            <button type="submit" disabled={joining} className="btn-secondary">
              {joining ? "Joining..." : "Join Tab"}
            </button>
          </form>
        </div>
      </div>

      {/* Group List Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
          <h2 className="font-display" style={{ fontSize: "18px", margin: 0 }}>
            Your Household Tabs {!loading && `(${groups.length})`}
          </h2>
        </div>

        {authLoading || loading ? (
          <div className="card" style={{ marginTop: 0 }}>
            <LoadingSpinner label="Loading your household tabs..." />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            title="No household tabs yet"
            description="You aren't a member of any flatmate tab yet. Create your first tab or join one with an invite code."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            {groups.map((group) => (
              <GroupCard key={group._id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
