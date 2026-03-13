"use client";

interface Props {
  keywords: { keyword: string; count: number }[];
}

export function KeywordCloud({ keywords }: Props) {
  if (!keywords || keywords.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">No keywords extracted yet</div>;
  }

  const maxCount = Math.max(...keywords.map((k) => k.count));

  return (
    <div className="flex flex-wrap gap-2 py-4">
      {keywords.map((kw) => {
        const ratio = kw.count / maxCount;
        const size = ratio > 0.7 ? "text-lg font-bold" : ratio > 0.4 ? "text-base font-semibold" : "text-sm font-medium";
        const bg = ratio > 0.7 ? "bg-slate-900 text-white" : ratio > 0.4 ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-600";
        return (
          <span key={kw.keyword} className={`rounded-full px-3 py-1 ${size} ${bg}`}>
            {kw.keyword}
            <span className="ml-1 opacity-60">({kw.count})</span>
          </span>
        );
      })}
    </div>
  );
}
