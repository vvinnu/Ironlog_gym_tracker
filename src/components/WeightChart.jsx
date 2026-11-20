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
  LineChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================================
// 01. BODYWEIGHT CHART
// ============================================================


/**
 * 01.01 - Render morning and bedtime body-weight trends.
 *
 * Converts the chart to the preferred display unit.
 * Missing check-ins remain missing.
 *
 * @param {Object} props
 * @returns {React.ReactElement}
 */
export default function WeightChart({
  data,
  large = false,
  unit = "kg",
  period = "both",
}) {
  // 01.02 - Group entries by measurement date.
  const grouped = new Map();

  for (const entry of data) {
    if (!["morning", "bedtime"].includes(entry.check_in_type)) {
      continue;
    }

    const date = entry.measurement_date;
    if (!date) continue;

    if (!grouped.has(date)) {
      grouped.set(date, { date });
    }

    const value = Number(entry.weight_kg);
    if (!Number.isFinite(value)) continue;

    grouped.get(date)[entry.check_in_type] = Number(
      (unit === "lbs" ? value * 2.2046226218 : value)
        .toFixed(1)
    );
  }

  const chart = [...grouped.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(entry => ({
      ...entry,
      label: new Date(`${entry.date}T12:00:00`)
        .toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
    }));

  const showMorning = period !== "bedtime";
  const showBedtime = period !== "morning";

  const hasVisibleData = chart.some(entry =>
    (showMorning && entry.morning !== undefined) ||
    (showBedtime && entry.bedtime !== undefined)
  );

  if (!hasVisibleData) {
    return (
      <div className="chart-empty">
        No check-ins for this selection yet.
      </div>
    );
  }

  return (
    <div className={`chart ${large ? "large" : ""}`}>
      <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
          <CartesianGrid stroke="#252a35" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: "#778091", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            domain={["dataMin - 1", "dataMax + 1"]}
            tick={{ fill: "#778091", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
            tickFormatter={value => Number(value).toFixed(1)}
          />

          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toFixed(1)} ${unit}`,
              name === "morning" ? "Morning" : "Bedtime",
            ]}
            labelFormatter={(_label, payload) => {
              const date = payload?.[0]?.payload?.date;
              return date || "";
            }}
            contentStyle={{
              background: "#151923",
              border: "1px solid #303746",
              borderRadius: 10,
              color: "#fff",
            }}
          />

          {showMorning && (
            <Line
              type="monotone"
              dataKey="morning"
              name="morning"
              stroke="#a3e635"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}

          {showBedtime && (
            <Line
              type="monotone"
              dataKey="bedtime"
              name="bedtime"
              stroke="#60a5fa"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}