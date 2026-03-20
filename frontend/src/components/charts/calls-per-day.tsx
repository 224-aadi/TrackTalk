"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { date: string; count: number }[];
}

export function CallsPerDayChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-n-400">
        No call data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E3EAF2" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#587399" }} stroke="#E3EAF2" />
        <YAxis tick={{ fontSize: 12, fill: "#587399" }} stroke="#E3EAF2" />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #E3EAF2",
            boxShadow: "0 4px 12px rgba(11,17,32,0.08)",
            fontSize: "13px",
          }}
        />
        <Bar dataKey="count" fill="#2544EB" radius={[6, 6, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
