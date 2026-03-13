"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  FileText,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type DashboardMetrics } from "@/lib/api";
import { formatPercent } from "@/lib/utils";
import { SentimentTrendChart } from "@/components/charts/sentiment-trend";
import { CallsPerDayChart } from "@/components/charts/calls-per-day";
import { OutcomeDonut } from "@/components/charts/outcome-donut";
import { KeywordCloud } from "@/components/dashboard/keyword-cloud";

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard"],
    queryFn: api.analysis.dashboard,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-medium">Failed to load dashboard</p>
        <p className="mt-1 text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  const metrics = data!;

  const statCards = [
    {
      title: "Total Calls",
      value: metrics.total_calls,
      icon: Phone,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Transcribed",
      value: metrics.total_transcribed,
      icon: FileText,
      color: "text-purple-600 bg-purple-50",
    },
    {
      title: "Analyzed",
      value: metrics.total_analyzed,
      icon: BarChart3,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Conversion Rate",
      value: formatPercent(metrics.conversion_rate),
      icon: TrendingUp,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-500">Overview of your call center analytics</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`rounded-lg p-3 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <SentimentTrendChart data={metrics.sentiment_trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calls Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <CallsPerDayChart data={metrics.calls_per_day} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outcome Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <OutcomeDonut data={metrics.outcome_distribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <KeywordCloud keywords={metrics.top_keywords} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
