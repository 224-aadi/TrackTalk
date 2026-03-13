"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CorrelationResult } from "@/lib/api";

interface Props {
  correlations: CorrelationResult[];
}

export function CorrelationChart({ correlations }: Props) {
  const data = correlations.slice(0, 20).map((c) => ({
    name: c.feature.replace(/_/g, " "),
    correlation: c.correlation,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(400, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 140 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" domain={[-1, 1]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={130} />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
          formatter={(value) => [Number(value).toFixed(4), "Correlation"]}
        />
        <Bar dataKey="correlation" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.correlation >= 0 ? "#10b981" : "#ef4444"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
