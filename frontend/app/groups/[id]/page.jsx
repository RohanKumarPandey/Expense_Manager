"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/authContext";
import { apiRequest } from "../../../lib/apiClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const fetchGroupDetail = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/groups/${id}`);
      setGroup(res.data.group);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && id) {
      fetchGroupDetail();
    }
  }, [user, authLoading, id, router]);

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
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) {
    return <div className="card">Loading group detail...</div>;
  }

  if (error && !group) {
    return (
      <div className="card">
        <div className="error-message">{error}</div>
        <Link href="/groups" style={{ color: "#2563eb" }}>← Back to Groups</Link>
      </div>
    );
  }

  const currentUserId = user?._id || user?.id;
  const currentMember = group?.members?.find(
    (m) => (m.user?._id || m.user?.id || m.user) === currentUserId
  );
  const isAdmin = currentMember?.role === "admin";

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <Link href="/groups" style={{ color: "#2563eb", fontSize: "14px", textDecoration: "none" }}>
          ← Back to Groups
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}
      {actionMessage && <div className="success-message">{actionMessage}</div>}

      <div className="card" style={{ marginTop: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "24px", marginBottom: "4px" }}>{group.name}</h1>
            {group.description && <p style={{ color: "#6b7280", fontSize: "14px" }}>{group.description}</p>}
          </div>
          <button
            onClick={handleLeaveGroup}
            style={{ width: "auto", backgroundColor: "#dc2626", padding: "6px 12px", fontSize: "13px" }}
          >
            Leave Group
          </button>
        </div>

        <div style={{ background: "#f3f4f6", padding: "12px", borderRadius: "6px", marginTop: "16px" }}>
          <p style={{ fontSize: "14px", margin: 0 }}>
            Invite Code: <strong style={{ letterSpacing: "1px", color: "#1e40af" }}>{group.inviteCode}</strong>
            <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>(Share this code with flatmates)</span>
          </p>
        </div>

        <h2 style={{ fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>
          Members ({group.members?.length || 0})
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {group.members?.map((m) => {
            const memberUser = typeof m.user === "object" ? m.user : { _id: m.user, name: "User", email: "" };
            const memberId = memberUser._id || memberUser.id;
            const isSelf = memberId === currentUserId;

            return (
              <div
                key={memberId}
                style={{
                  display: "flex",
                  justify: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  background: "#fff",
                }}
              >
                <div>
                  <strong style={{ fontSize: "15px" }}>{memberUser.name}</strong>{" "}
                  {isSelf && <span style={{ fontSize: "12px", color: "#2563eb" }}>(You)</span>}
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>{memberUser.email}</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: m.role === "admin" ? "#dbeafe" : "#f3f4f6",
                      color: m.role === "admin" ? "#1e40af" : "#374151",
                      fontWeight: 500,
                    }}
                  >
                    {m.role}
                  </span>

                  {isAdmin && !isSelf && (
                    <button
                      onClick={() => handleRemoveMember(memberId, memberUser.name)}
                      style={{ width: "auto", padding: "4px 8px", fontSize: "12px", backgroundColor: "#ef4444" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
