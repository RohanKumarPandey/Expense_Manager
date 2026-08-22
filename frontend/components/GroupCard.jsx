"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Copy, ArrowRight, Check } from "lucide-react";

export default function GroupCard({ group }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const memberCount = group.members ? group.members.length : 0;

  return (
    <div
      className="card"
      style={{
        marginTop: 0,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <h3 className="font-display" style={{ fontSize: "18px", margin: "0 0 4px 0" }}>
          <Link
            href={`/groups/${group._id}`}
            style={{ textDecoration: "none", color: "var(--ink)" }}
          >
            {group.name}
          </Link>
        </h3>

        {group.description && (
          <p
            className="font-body"
            style={{ color: "rgba(34, 41, 31, 0.65)", fontSize: "13px", margin: "0 0 12px 0" }}
          >
            {group.description}
          </p>
        )}

        {/* Dotted leader line with Users and Copy code button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px dotted var(--line)",
            marginBottom: "16px",
          }}
        >
          <span
            className="font-body"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "rgba(34, 41, 31, 0.65)",
            }}
          >
            <Users size={13} />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="btn-secondary"
            style={{
              width: "auto",
              minHeight: "auto",
              padding: "2px 8px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 600,
              backgroundColor: "rgba(201, 154, 46, 0.15)",
              color: "var(--mustard)",
              border: "1px solid rgba(201, 154, 46, 0.3)",
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
            }}
            title="Click to copy invite code"
          >
            {group.inviteCode}
            {copied ? <Check size={12} style={{ color: "var(--moss)" }} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <Link href={`/groups/${group._id}`} style={{ textDecoration: "none" }}>
        <button
          className="btn-primary"
          style={{
            width: "100%",
            padding: "8px 14px",
            fontSize: "13px",
            minHeight: "38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>Open Tab</span>
          <ArrowRight size={16} />
        </button>
      </Link>
    </div>
  );
}
