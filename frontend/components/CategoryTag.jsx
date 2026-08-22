"use client";

export default function CategoryTag({ category }) {
  if (!category) return null;

  return (
    <span
      className="category-pill"
      style={{
        display: "inline-block",
        backgroundColor: "rgba(201, 154, 46, 0.15)",
        color: "#C99A2E",
        fontFamily: "'Inter', sans-serif",
        fontSize: "11px",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "9999px",
        textTransform: "capitalize",
      }}
    >
      {category}
    </span>
  );
}
