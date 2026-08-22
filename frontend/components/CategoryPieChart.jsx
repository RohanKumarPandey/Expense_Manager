"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Grounded ledger palette: Moss, Mustard, Rust, Sage, Amber, Terracotta, Ink
const COLORS = ["#4F6B4A", "#C99A2E", "#A8492F", "#728F6C", "#D8B558", "#BD644A", "#22291F"];

export default function CategoryPieChart({ data }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(34, 41, 31, 0.5)", fontSize: "13px" }}>
        Loading chart...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(34, 41, 31, 0.6)", fontSize: "13px" }}>
        No expense data yet to display category breakdown.
      </div>
    );
  }

  const chartData = data
    .filter((d) => d.total > 0)
    .map((d) => ({
      category: d.category.charAt(0).toUpperCase() + d.category.slice(1),
      total: Number(d.total.toFixed(2)),
    }));

  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(34, 41, 31, 0.6)", fontSize: "13px" }}>
        No expense data yet to display category breakdown.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "260px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={42}
            paddingAngle={3}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--ink)",
              color: "var(--paper)",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px",
            }}
            itemStyle={{ color: "var(--paper)" }}
            formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Your Share"]}
          />
          <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ fontSize: "12px", fontFamily: "'Inter', sans-serif" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
