"use client";

import { useAuth } from "../lib/authContext";
import Link from "next/link";
import LoadingSpinner from "../components/LoadingSpinner";

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="card">
        <LoadingSpinner label="Authenticating session..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <span style={{ fontSize: "40px", display: "block", marginBottom: "8px" }}>🏠</span>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px 0" }}>
            Flatmate Expense Manager
          </h1>
          <p style={{ color: "#4b5563", fontSize: "15px", margin: 0 }}>
            Split expenses fairly, simplify debts automatically, and manage shared living with ease.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/login" style={{ flex: "1 1 140px" }}>
            <button style={{ width: "100%", padding: "12px" }}>Log In</button>
          </Link>
          <Link href="/signup" style={{ flex: "1 1 140px" }}>
            <button style={{ width: "100%", backgroundColor: "#4b5563", padding: "12px" }}>
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 6px 0" }}>
          Welcome back, {user.name}!
        </h1>
        <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
          Logged in as <strong>{user.email}</strong>
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}>
        <Link href="/dashboard" style={{ flex: "1 1 160px" }}>
          <button style={{ width: "100%", backgroundColor: "#059669", padding: "12px" }}>
            📊 View Dashboard
          </button>
        </Link>
        <Link href="/groups" style={{ flex: "1 1 160px" }}>
          <button style={{ width: "100%", backgroundColor: "#2563eb", padding: "12px" }}>
            👥 Manage Groups
          </button>
        </Link>
        <button
          onClick={logout}
          style={{ flex: "1 1 120px", backgroundColor: "#dc2626", padding: "12px" }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
