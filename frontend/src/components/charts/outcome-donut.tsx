"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  purchase: "#10b981",
  no_purchase: "#ef4444",
  pending: "#94a3b8",
};

interface Props {
  data: Record<string, number>;
}

export function OutcomeDonut({ data }: Props) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  if (chartData.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">No outcome data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] || "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
