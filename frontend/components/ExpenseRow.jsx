"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

export default function ExpenseRow({ expense, groupId, currentUserId, isAdmin, onDelete }) {
  const isCreator =
    (expense.createdBy?._id || expense.createdBy?.id || expense.createdBy) === currentUserId;
  const canDelete = isCreator || isAdmin;
  const paidByName = typeof expense.paidBy === "object" ? expense.paidBy?.name : "Someone";
  const dateStr = new Date(expense.date || expense.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const amountRupees = expense.amount / 100;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        borderBottom: "1px dotted var(--line)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            className="font-body"
            style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}
          >
            {expense.description}
          </span>
          <span
            className="category-pill"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "9999px",
              textTransform: "capitalize",
              backgroundColor: "rgba(201, 154, 46, 0.15)",
              color: "var(--mustard)",
            }}
          >
            {expense.category}
          </span>
        </div>
        <p
          className="font-body"
          style={{
            fontSize: "12px",
            color: "rgba(34, 41, 31, 0.55)",
            marginTop: "2px",
            margin: 0,
          }}
        >
          {paidByName} paid · {dateStr} · {expense.splitType || "equal"} split
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <span
          className="font-mono tabular-nums"
          style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)" }}
        >
          ₹{amountRupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>

        {isCreator && (
          <Link href={`/groups/${groupId}/edit/${expense._id}`}>
            <button
              className="btn-secondary"
              style={{
                width: "auto",
                minHeight: "28px",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Edit expense"
            >
              <Pencil size={12} />
            </button>
          </Link>
        )}

        {canDelete && (
          <button
            onClick={() => onDelete(expense._id, expense.description)}
            className="btn-destructive"
            style={{
              width: "auto",
              minHeight: "28px",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="Delete expense"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
