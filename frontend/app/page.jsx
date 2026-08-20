"use client";

import { useAuth } from "../lib/authContext";
import Link from "next/link";

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="card">Loading auth state...</div>;
  }

  if (!user) {
    return (
      <div className="card">
        <h1 style={{ marginBottom: "16px", fontSize: "24px" }}>Flatmate Expense Manager</h1>
        <p style={{ marginBottom: "20px" }}>Welcome! Please log in or sign up to manage your expenses.</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/login" style={{ flex: 1 }}>
            <button style={{ width: "100%" }}>Log In</button>
          </Link>
          <Link href="/signup" style={{ flex: 1 }}>
            <button style={{ width: "100%", backgroundColor: "#4b5563" }}>Sign Up</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 style={{ marginBottom: "12px", fontSize: "24px" }}>Dashboard</h1>
      <p style={{ marginBottom: "16px", fontSize: "16px" }}>
        Logged in as <strong>{user.name}</strong> ({user.email})
      </p>
      <div style={{ background: "#f3f4f6", padding: "12px", borderRadius: "6px", marginBottom: "20px" }}>
        <p style={{ fontSize: "14px" }}>User ID: <code>{user._id || user.id}</code></p>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <Link href="/groups" style={{ flex: 1 }}>
          <button style={{ width: "100%", backgroundColor: "#2563eb" }}>Manage Groups</button>
        </Link>
        <button onClick={logout} style={{ flex: 1, backgroundColor: "#dc2626" }}>
          Log Out
        </button>
      </div>
    </div>
  );
}
