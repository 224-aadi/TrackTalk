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
  if (score === null) return "text-n-400";
  if (score > 0.1) return "text-success-500";
  if (score < -0.1) return "text-danger-500";
  return "text-warning-500";
}

export function sentimentBg(score: number | null): string {
  if (score === null) return "bg-n-100";
  if (score > 0.1) return "bg-success-50";
  if (score < -0.1) return "bg-danger-50";
  return "bg-warning-50";
}

export function outcomeColor(outcome: string): string {
  switch (outcome) {
    case "purchase":
      return "text-success-700 bg-success-50";
    case "no_purchase":
      return "text-danger-600 bg-danger-50";
    default:
      return "text-n-500 bg-n-100";
  }
}

export const CHART_COLORS = [
  "#2544EB",
  "#FF5513",
  "#0CA678",
  "#F08C00",
  "#7B93B2",
  "#1D35D8",
  "#E8390A",
];
