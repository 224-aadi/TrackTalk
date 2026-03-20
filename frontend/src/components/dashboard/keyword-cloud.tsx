"use client";

interface Props {
  keywords: { keyword: string; count: number }[];
}

export function KeywordCloud({ keywords }: Props) {
  if (!keywords || keywords.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-n-400">
        No keywords extracted yet
      </div>
    );
  }

  const maxCount = Math.max(...keywords.map((k) => k.count));

  return (
    <div className="flex flex-wrap gap-2 py-4">
      {keywords.map((kw) => {
        const ratio = kw.count / maxCount;
        const size =
          ratio > 0.7
            ? "text-[15px] font-bold"
            : ratio > 0.4
              ? "text-[13px] font-semibold"
              : "text-xs font-medium";
        const style =
          ratio > 0.7
            ? "bg-brand-600 text-white"
            : ratio > 0.4
              ? "bg-brand-100 text-brand-800"
              : "bg-n-100 text-n-600";
        return (
          <span key={kw.keyword} className={`rounded-lg px-3 py-1 ${size} ${style}`}>
            {kw.keyword}
            <span className="ml-1 opacity-60">({kw.count})</span>
          </span>
        );
      })}
    </div>
  );
}
