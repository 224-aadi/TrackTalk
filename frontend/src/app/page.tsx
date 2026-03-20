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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-n-200 border-t-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger-100 bg-danger-50 p-6 text-danger-600">
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
      border: "border-l-brand-500",
      iconColor: "text-brand-600",
    },
    {
      title: "Transcribed",
      value: metrics.total_transcribed,
      icon: FileText,
      border: "border-l-accent-500",
      iconColor: "text-accent-500",
    },
    {
      title: "Analyzed",
      value: metrics.total_analyzed,
      icon: BarChart3,
      border: "border-l-success-500",
      iconColor: "text-success-500",
    },
    {
      title: "Conversion Rate",
      value: formatPercent(metrics.conversion_rate),
      icon: TrendingUp,
      border: "border-l-warning-500",
      iconColor: "text-warning-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-n-900">Dashboard</h1>
        <p className="mt-1 text-n-500">Overview of your call center analytics</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className={`${stat.border} border-l-4`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-n-500">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold text-n-900">{stat.value}</p>
                </div>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
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
