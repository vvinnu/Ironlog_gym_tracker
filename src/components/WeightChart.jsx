/**
 * IRONLOG — WEIGHT CHART
 * File: src/components/WeightChart.jsx
 * Responsibility: Render the bodyweight trend chart.
 * Dependencies: React, Recharts.
 * Used by: Dashboard.jsx, ProgressPage.jsx.
 * Related: src/components/AppShared.jsx.
 */
import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================================
// 01. BODYWEIGHT CHART
// ============================================================

/**
 * 01.01 - Render logged bodyweight measurements.
 * @param {{data: Array, large?: boolean}} props
 * @returns {React.ReactElement}
 */
export default function WeightChart({ data, large }) {
  if (!data.length) {
    return (
      <div className="chart-empty">
        Log your first weigh-in to see a chart.
      </div>
    );
  }

  const chart = data.map((x, i) => ({
    date: new Date(x.logged_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    weight: Number(x.weight_kg),
    i,
  }));

  return (
    <div className={`chart ${large ? "large" : ""}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chart}>
          <defs>
            <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a3e635" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#252a35" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#778091", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={["dataMin - 1", "dataMax + 1"]}
            tick={{ fill: "#778091", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              background: "#151923",
              border: "1px solid #303746",
              borderRadius: 10,
              color: "#fff",
            }}
          />
          <Area
            type="monotone"
            dataKey="weight"
            stroke="#a3e635"
            strokeWidth={2.5}
            fill="url(#weightFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}