"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function CategoryPieChart({ data }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: "14px" }}>
        Loading chart...
      </div>
    );
  }

  // data: [{ category: "rent", total: 1500 }, ...]
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280", fontSize: "14px" }}>
        No expense data yet to display category breakdown.
      </div>
    );
  }

  // Filter out any zero amounts and format name
  const chartData = data
    .filter((d) => d.total > 0)
    .map((d) => ({
      category: d.category.charAt(0).toUpperCase() + d.category.slice(1),
      total: Number(d.total.toFixed(2)),
    }));

  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280", fontSize: "14px" }}>
        No expense data yet to display category breakdown.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "280px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={85}
            innerRadius={45}
            paddingAngle={3}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Your Share"]} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
