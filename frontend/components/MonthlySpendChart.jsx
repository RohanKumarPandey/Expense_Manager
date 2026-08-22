"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function MonthlySpendChart({ data }) {
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

  const chartData = (data || []).map((d) => ({
    label: `${MONTH_NAMES[(d.month || 1) - 1]} ${d.year}`,
    total: Number(d.total.toFixed(2)),
  }));

  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(34, 41, 31, 0.6)", fontSize: "13px" }}>
        No trend data yet to display monthly spending.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "260px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "rgba(34, 41, 31, 0.6)", fontFamily: "'Inter', sans-serif" }} />
          <YAxis tick={{ fontSize: 12, fill: "rgba(34, 41, 31, 0.6)", fontFamily: "'IBM Plex Mono', monospace" }} tickFormatter={(val) => `₹${val}`} />
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
            formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Household Total"]}
          />
          <Bar dataKey="total" fill="#4F6B4A" radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
