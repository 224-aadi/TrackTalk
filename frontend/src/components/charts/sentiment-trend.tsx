"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { date: string; sentiment: number }[];
}

export function SentimentTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">No sentiment data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis domain={[-1, 1]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
          formatter={(value) => [Number(value).toFixed(3), "Sentiment"]}
        />
        <Line
          type="monotone"
          dataKey="sentiment"
          stroke="#0f172a"
          strokeWidth={2}
          dot={{ r: 4, fill: "#0f172a" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
