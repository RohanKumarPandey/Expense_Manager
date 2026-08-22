"use client";

import { useState } from "react";
import { useAuth } from "../../lib/authContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ErrorBanner from "../../components/ErrorBanner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "380px", margin: "40px auto 0 auto" }}>
      <div className="card" style={{ padding: "32px 24px" }}>
        <div style={{ marginBottom: "20px" }}>
          <h1 className="font-display" style={{ fontSize: "22px", margin: "0 0 4px 0" }}>
            Log in to your tab
          </h1>
          <p className="font-body" style={{ color: "rgba(34, 41, 31, 0.65)", fontSize: "13px", margin: 0 }}>
            Access your shared household ledgers
          </p>
        </div>

        <ErrorBanner message={error} />

        <form onSubmit={handleSubmit}>
          <div>
            <label>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: "4px" }}>
            {loading ? "Opening session..." : "Log in"}
          </button>
        </form>

        <div
          className="font-body"
          style={{
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid var(--line)",
            textAlign: "center",
            fontSize: "13px",
            color: "rgba(34, 41, 31, 0.7)",
          }}
        >
          Don't have a tab account?{" "}
          <Link
            href="/signup"
            style={{
              color: "var(--moss)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
