"use client";

import { useState } from "react";
import { useAuth } from "../../lib/authContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ErrorBanner from "../../components/ErrorBanner";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signup(name, email, password);
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
            Create an account
          </h1>
          <p className="font-body" style={{ color: "rgba(34, 41, 31, 0.65)", fontSize: "13px", margin: 0 }}>
            Start managing tabs with your flatmates
          </p>
        </div>

        <ErrorBanner message={error} />

        <form onSubmit={handleSubmit}>
          <div>
            <label>Your Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohan Pandey"
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: "4px" }}>
            {loading ? "Creating account..." : "Sign up"}
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
          Already have an account?{" "}
          <Link
            href="/login"
            style={{
              color: "var(--moss)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
