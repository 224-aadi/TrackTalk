"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  purchase: "#0CA678",
  no_purchase: "#E03131",
  pending: "#7B93B2",
};

interface Props {
  data: Record<string, number>;
}

export function OutcomeDonut({ data }: Props) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-n-400">
        No outcome data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={105}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] || "#7B93B2"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #E3EAF2",
            boxShadow: "0 4px 12px rgba(11,17,32,0.08)",
            fontSize: "13px",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-sm text-n-600 ml-1">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
