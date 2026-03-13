"use client";

import { Badge } from "@/components/ui/badge";
import type { ComparisonStats } from "@/lib/api";

interface Props {
  stats: ComparisonStats[];
}

export function ComparisonTable({ stats }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-3 text-left font-medium text-slate-500">Feature</th>
            <th className="py-3 text-right font-medium text-emerald-600">Purchase Mean</th>
            <th className="py-3 text-right font-medium text-red-600">No Purchase Mean</th>
            <th className="py-3 text-right font-medium text-slate-500">Difference</th>
            <th className="py-3 text-center font-medium text-slate-500">Significant</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.metric} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2.5 font-medium text-slate-700">{s.metric.replace(/_/g, " ")}</td>
              <td className="py-2.5 text-right font-mono text-emerald-700">{s.purchase_mean.toFixed(3)}</td>
              <td className="py-2.5 text-right font-mono text-red-700">{s.no_purchase_mean.toFixed(3)}</td>
              <td className="py-2.5 text-right font-mono text-slate-900">
                {s.difference > 0 ? "+" : ""}{s.difference.toFixed(3)}
              </td>
              <td className="py-2.5 text-center">
                {s.significant ? (
                  <Badge variant="success">Yes</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
