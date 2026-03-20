"use client";

import {
  AreaChart,
  Area,
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
    return (
      <div className="flex h-64 items-center justify-center text-sm text-n-400">
        No sentiment data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2544EB" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#2544EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E3EAF2" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#587399" }} stroke="#E3EAF2" />
        <YAxis domain={[-1, 1]} tick={{ fontSize: 12, fill: "#587399" }} stroke="#E3EAF2" />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #E3EAF2",
            boxShadow: "0 4px 12px rgba(11,17,32,0.08)",
            fontSize: "13px",
          }}
          formatter={(value) => [Number(value).toFixed(3), "Sentiment"]}
        />
        <Area
          type="monotone"
          dataKey="sentiment"
          stroke="#2544EB"
          strokeWidth={2}
          fill="url(#sentGrad)"
          dot={{ r: 3, fill: "#2544EB", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#2544EB", strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
