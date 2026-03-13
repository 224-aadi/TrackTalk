"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, FileText, AlertTriangle, Lightbulb, Target, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const API = "http://localhost:8000/api";

interface ReportListItem {
  id: string;
  title: string;
  report_type: string;
  summary: string;
  created_at: string;
}

interface ReportData {
  executive_summary: string;
  key_findings: { finding: string; impact: string; evidence: string }[];
  recommendations: { recommendation: string; priority: string; expected_impact: string; implementation: string }[];
  risk_areas: { risk: string; severity: string; mitigation: string }[];
  opportunities: { opportunity: string; potential: string; action_needed: string }[];
  metrics_targets: Record<string, number>;
}

interface ReportDetail {
  id: string;
  title: string;
  data: ReportData;
  summary: string;
  created_at: string;
}

interface SummaryData {
  total_calls: number;
  analyzed_calls: number;
  avg_sentiment: number;
  avg_quality: number;
  avg_qa_score: number | null;
  outcomes: Record<string, number>;
  agent_stats: { name: string; team: string; calls: number; avg_sentiment: number }[];
  top_objections: { item: string; count: number }[];
  top_tactics: { item: string; count: number }[];
  intent_breakdown: { item: string; count: number }[];
}

export default function InsightsPage() {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const { data: summary } = useQuery<SummaryData>({
    queryKey: ["insights-summary"],
    queryFn: () => fetch(`${API}/insights/summary`).then((r) => r.json()),
  });

  const { data: reports, isLoading } = useQuery<ReportListItem[]>({
    queryKey: ["reports"],
    queryFn: () => fetch(`${API}/insights/reports`).then((r) => r.json()),
  });

  const { data: reportDetail } = useQuery<ReportDetail>({
    queryKey: ["report-detail", selectedReport],
    queryFn: () => fetch(`${API}/insights/reports/${selectedReport}`).then((r) => r.json()),
    enabled: !!selectedReport,
  });

  const generateReport = useMutation({
    mutationFn: () => fetch(`${API}/insights/generate-report`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setSelectedReport((data as { id: string }).id);
    },
  });

  const activeReport = reportDetail?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Strategic Insights</h1>
          <p className="mt-1 text-slate-500">AI-generated strategic analysis and recommendations</p>
        </div>
        <Button onClick={() => generateReport.mutate()} disabled={generateReport.isPending}>
          <FileText className="h-4 w-4" />
          {generateReport.isPending ? "Generating..." : "Generate Report"}
        </Button>
      </div>

      {/* Quick stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-500">Total Calls</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total_calls}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-500">Avg Quality</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.avg_quality}/10</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-500">Avg Sentiment</p>
              <p className={`mt-1 text-2xl font-bold ${summary.avg_sentiment >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {summary.avg_sentiment.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-500">Avg QA Score</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {summary.avg_qa_score ? `${Math.round(summary.avg_qa_score)}/100` : "N/A"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-500">Agents</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.agent_stats.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report selector */}
      {reports && reports.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reports.map((r) => (
            <Button
              key={r.id}
              variant={selectedReport === r.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedReport(r.id)}
            >
              {new Date(r.created_at).toLocaleDateString()}
            </Button>
          ))}
        </div>
      )}

      {/* Report content */}
      {activeReport ? (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Executive Summary</TabsTrigger>
            <TabsTrigger value="findings">Key Findings</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="risks">Risks & Opportunities</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">{activeReport.executive_summary}</p>

                {activeReport.metrics_targets && Object.keys(activeReport.metrics_targets).length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Target Metrics</h3>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {Object.entries(activeReport.metrics_targets).map(([key, val]) => (
                        <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                          <p className="text-xs text-slate-500">{key.replace(/_/g, " ")}</p>
                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {typeof val === "number" && val < 1 ? `${(val * 100).toFixed(0)}%` : val}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="findings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Key Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeReport.key_findings?.map((f, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-slate-800">{f.finding}</p>
                        <Badge variant={f.impact === "high" ? "destructive" : f.impact === "medium" ? "warning" : "secondary"}>
                          {f.impact} impact
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{f.evidence}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" /> Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeReport.recommendations?.map((r, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-slate-800">{r.recommendation}</p>
                        <Badge variant={r.priority === "high" ? "destructive" : r.priority === "medium" ? "warning" : "secondary"}>
                          {r.priority}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-emerald-700">Expected impact: {r.expected_impact}</p>
                      <p className="mt-1 text-xs text-slate-500">How: {r.implementation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" /> Risk Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeReport.risk_areas?.map((r, i) => (
                      <div key={i} className="rounded-lg border border-red-100 bg-red-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-red-800">{r.risk}</p>
                          <Badge variant="destructive">{r.severity}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-red-700">Mitigation: {r.mitigation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-700">
                    <Target className="h-5 w-5" /> Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeReport.opportunities?.map((o, i) => (
                      <div key={i} className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-sm font-medium text-emerald-800">{o.opportunity}</p>
                        <p className="mt-1 text-xs text-emerald-700">Potential: {o.potential}</p>
                        <p className="mt-1 text-xs text-slate-600">Action: {o.action_needed}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-500">No reports generated yet</p>
            <p className="text-sm text-slate-400">
              Click &ldquo;Generate Report&rdquo; for an AI-powered strategic analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
