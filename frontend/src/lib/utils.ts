import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function sentimentColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score > 0.1) return "text-emerald-500";
  if (score < -0.1) return "text-red-500";
  return "text-amber-500";
}

export function sentimentBg(score: number | null): string {
  if (score === null) return "bg-gray-100";
  if (score > 0.1) return "bg-emerald-50";
  if (score < -0.1) return "bg-red-50";
  return "bg-amber-50";
}

export function outcomeColor(outcome: string): string {
  switch (outcome) {
    case "purchase":
      return "text-emerald-600 bg-emerald-50";
    case "no_purchase":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}
