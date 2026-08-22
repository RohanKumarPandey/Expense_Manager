"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/authContext";
import { Receipt, LayoutDashboard, Wallet, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      style={{
        borderBottom: "1px solid var(--line)",
        backgroundColor: "var(--paper)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "1020px",
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Brand in Fraunces font-display with Receipt icon (strokeWidth 1.75) */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <Receipt size={22} strokeWidth={1.75} style={{ color: "var(--moss)" }} />
          <div>
            <h1
              className="font-display"
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--ink)",
                lineHeight: "1.15",
                margin: 0,
              }}
            >
              The Running Tab
            </h1>
            <p
              className="font-body"
              style={{
                fontSize: "11px",
                color: "rgba(34, 41, 31, 0.6)",
                fontWeight: 500,
                margin: 0,
              }}
            >
              Household Expense Ledger
            </p>
          </div>
        </Link>

        {/* Navigation links if authenticated */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <nav style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Link
                href="/dashboard"
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  textDecoration: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  color: pathname === "/dashboard" ? "var(--moss)" : "var(--ink)",
                  backgroundColor: pathname === "/dashboard" ? "rgba(79, 107, 74, 0.12)" : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/groups"
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  textDecoration: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  color: pathname.startsWith("/groups") ? "var(--moss)" : "var(--ink)",
                  backgroundColor: pathname.startsWith("/groups") ? "rgba(79, 107, 74, 0.12)" : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <Wallet size={15} />
                <span>Groups</span>
              </Link>
            </nav>

            <div
              style={{
                width: "1px",
                height: "18px",
                backgroundColor: "var(--line)",
              }}
            />

            {/* User Initials Badge & Logout Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "var(--white)",
                  padding: "4px 8px 4px 4px",
                  borderRadius: "20px",
                  border: "1px solid var(--line)",
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    backgroundColor: "var(--moss)",
                    color: "var(--paper)",
                    fontSize: "10px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {getInitials(user.name)}
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--ink)",
                    maxWidth: "110px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={user.name}
                >
                  {user.name}
                </span>
              </div>

              <button
                onClick={logout}
                className="btn-secondary"
                style={{
                  width: "auto",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 500,
                  minHeight: "30px",
                  borderRadius: "6px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Sign out of your session"
              >
                <LogOut size={13} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        ) : !isAuthPage ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link href="/login">
              <button
                className="btn-secondary"
                style={{
                  width: "auto",
                  padding: "6px 14px",
                  fontSize: "13px",
                  minHeight: "36px",
                }}
              >
                Log In
              </button>
            </Link>
            <Link href="/signup">
              <button
                className="btn-primary"
                style={{
                  width: "auto",
                  padding: "6px 14px",
                  fontSize: "13px",
                  minHeight: "36px",
                }}
              >
                Sign Up
              </button>
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
