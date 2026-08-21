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
      <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: "14px" }}>
        Loading chart...
      </div>
    );
  }

  // data: [{ year: 2026, month: 1, total: 5000 }, ...]
  const chartData = (data || []).map((d) => ({
    label: `${MONTH_NAMES[(d.month || 1) - 1]} ${d.year}`,
    total: Number(d.total.toFixed(2)),
  }));

  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280", fontSize: "14px" }}>
        No trend data yet to display monthly spending.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "280px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7280" }} />
          <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(val) => `₹${val}`} />
          <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Household Total"]} />
          <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
