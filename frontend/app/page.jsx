"use client";

import { useAuth } from "../lib/authContext";
import Link from "next/link";
import LoadingSpinner from "../components/LoadingSpinner";
import { ArrowRight, LayoutDashboard, Wallet, LogOut, Receipt, Sparkles, Split } from "lucide-react";

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="card">
        <LoadingSpinner label="Opening ledger..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: "680px", margin: "32px auto" }}>
        {/* Ledger Hero */}
        <div className="card" style={{ padding: "40px 28px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(201, 154, 46, 0.15)",
              color: "var(--mustard)",
              padding: "3px 10px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "16px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Receipt size={13} />
            <span>Household Expense Ledger</span>
          </div>

          <h1
            className="font-display"
            style={{
              fontSize: "30px",
              color: "var(--ink)",
              marginBottom: "12px",
              lineHeight: 1.25,
            }}
          >
            A running tab for people who live together.
          </h1>

          <p
            className="font-body"
            style={{
              color: "rgba(34, 41, 31, 0.75)",
              fontSize: "15px",
              maxWidth: "480px",
              margin: "0 auto 28px auto",
              lineHeight: 1.6,
            }}
          >
            Tally groceries, rent, and utilities with zero rounding drift. Natural language
            AI entry and debt-simplified settlements that feel like a kitchen whiteboard.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
              maxWidth: "340px",
              margin: "0 auto",
            }}
          >
            <Link href="/signup" style={{ flex: "1 1 140px", textDecoration: "none" }}>
              <button
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "10px 18px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span>Start a Tab</span>
                <ArrowRight size={16} />
              </button>
            </Link>
            <Link href="/login" style={{ flex: "1 1 140px", textDecoration: "none" }}>
              <button className="btn-secondary" style={{ width: "100%", padding: "10px 18px" }}>
                Log In
              </button>
            </Link>
          </div>
        </div>

        {/* Quiet Feature Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
            marginTop: "16px",
          }}
        >
          <div className="card" style={{ marginTop: 0, padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Split size={16} style={{ color: "var(--moss)" }} />
              <h3 className="font-display" style={{ fontSize: "16px", margin: 0 }}>
                Minimal Settlement
              </h3>
            </div>
            <p className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.65)", margin: 0 }}>
              Clears all household debts in at most N - 1 payments via greedy bipartite matching.
            </p>
          </div>

          <div className="card" style={{ marginTop: 0, padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Sparkles size={16} style={{ color: "var(--mustard)" }} />
              <h3 className="font-display" style={{ fontSize: "16px", margin: 0 }}>
                Natural AI Entry
              </h3>
            </div>
            <p className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.65)", margin: 0 }}>
              "Dinner 1200 with Rohan" in English or Hindi drafts amount, category, and payer instantly.
            </p>
          </div>

          <div className="card" style={{ marginTop: 0, padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Receipt size={16} style={{ color: "var(--ink)" }} />
              <h3 className="font-display" style={{ fontSize: "16px", margin: 0 }}>
                Integer Precision
              </h3>
            </div>
            <p className="font-body" style={{ fontSize: "13px", color: "rgba(34, 41, 31, 0.65)", margin: 0 }}>
              Integer-paise calculations prevent any 1-paisa rounding errors across split percentages.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Hub
  return (
    <div style={{ maxWidth: "720px", margin: "24px auto" }}>
      <div className="card" style={{ marginTop: 0, padding: "28px" }}>
        <div style={{ marginBottom: "20px" }}>
          <span
            className="font-mono tabular-nums"
            style={{
              fontSize: "12px",
              color: "rgba(34, 41, 31, 0.5)",
              display: "block",
              marginBottom: "2px",
            }}
          >
            ACTIVE SESSION
          </span>
          <h1 className="font-display" style={{ fontSize: "24px", margin: "0 0 4px 0" }}>
            Welcome back, {user.name}
          </h1>
          <p className="font-body" style={{ color: "rgba(34, 41, 31, 0.7)", fontSize: "14px", margin: 0 }}>
            Signed in as <strong>{user.email}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{ flex: "1 1 160px", textDecoration: "none" }}>
            <button
              className="btn-primary"
              style={{
                width: "100%",
                padding: "10px 16px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <LayoutDashboard size={15} />
              <span>Open Dashboard</span>
            </button>
          </Link>
          <Link href="/groups" style={{ flex: "1 1 160px", textDecoration: "none" }}>
            <button
              className="btn-secondary"
              style={{
                width: "100%",
                padding: "10px 16px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Wallet size={15} />
              <span>View Groups</span>
            </button>
          </Link>
          <button
            onClick={logout}
            className="btn-destructive"
            style={{
              flex: "1 1 100px",
              padding: "10px 16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
