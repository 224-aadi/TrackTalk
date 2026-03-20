"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Play, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { BACKEND_ORIGIN } from "@/lib/api";
const API = `${BACKEND_ORIGIN}/api`;

interface QAScoreItem {
  id: string;
  call_id: string;
  original_filename: string;
  agent_name: string;
  total_score: number;
  flags_count: number;
  critical_flags: number;
  mandatory_passed: boolean;
  created_at: string;
}

interface QADetail {
  id: string;
  call_id: string;
  total_score: number;
  breakdown: {
    total_score: number;
    rule_results: { rule_name: string; passed: boolean; score: number; evidence: string }[];
    flags: { severity: string; issue: string; detail: string }[];
    positive_notes: string[];
    mandatory_check: { all_mandatory_passed: boolean; missed_mandatory: string[] };
  };
}

export default function QAPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: scores, isLoading } = useQuery<QAScoreItem[]>({
    queryKey: ["qa-scores"],
    queryFn: () => fetch(`${API}/qa/scores`).then((r) => r.json()),
  });

  const scoreAll = useMutation({
    mutationFn: () => fetch(`${API}/qa/score-all`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["qa-scores"] }),
  });

  const { data: detail } = useQuery<QADetail>({
    queryKey: ["qa-detail", expanded],
    queryFn: () => fetch(`${API}/qa/scores/${expanded}`).then((r) => r.json()),
    enabled: !!expanded,
  });

  const avgScore = scores?.length
    ? Math.round(scores.reduce((a, s) => a + s.total_score, 0) / scores.length)
    : 0;
  const criticalCount = scores?.reduce((a, s) => a + s.critical_flags, 0) || 0;
  const mandatoryFailCount = scores?.filter((s) => !s.mandatory_passed).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-n-900">QA &amp; Compliance</h1>
          <p className="mt-1 text-n-500">Automated quality scoring against compliance rules</p>
        </div>
        <Button onClick={() => scoreAll.mutate()} disabled={scoreAll.isPending}>
          <Play className="h-4 w-4" />
          {scoreAll.isPending ? "Scoring..." : "Score All Calls"}
        </Button>
      </div>

      {scoreAll.isSuccess && (
        <div className="rounded-lg border border-success-100 bg-success-50 p-4 text-sm text-success-700">
          Scored {(scoreAll.data as { scored: number }).scored} calls
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-n-200 border-t-brand-600" />
        </div>
      ) : !scores || scores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShieldCheck className="h-12 w-12 text-n-300" />
            <p className="mt-4 text-lg font-medium text-n-500">No QA scores yet</p>
            <p className="text-sm text-n-400">
              Click &ldquo;Score All Calls&rdquo; to run compliance checks on all analyzed calls
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="border-l-4 border-l-brand-500">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-n-500">Avg QA Score</p>
                <p className={`mt-1 text-3xl font-bold ${avgScore >= 70 ? "text-success-600" : avgScore >= 50 ? "text-warning-600" : "text-danger-600"}`}>
                  {avgScore}/100
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-accent-500">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-n-500">Calls Scored</p>
                <p className="mt-1 text-3xl font-bold text-n-900">{scores.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-danger-500">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-n-500">Critical Flags</p>
                <p className={`mt-1 text-3xl font-bold ${criticalCount > 0 ? "text-danger-600" : "text-success-600"}`}>
                  {criticalCount}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-warning-500">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-n-500">Mandatory Failures</p>
                <p className={`mt-1 text-3xl font-bold ${mandatoryFailCount > 0 ? "text-danger-600" : "text-success-600"}`}>
                  {mandatoryFailCount}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {scores.map((score) => (
              <Card key={score.id} className="overflow-hidden">
                <div
                  className="flex cursor-pointer items-center justify-between p-5 transition-colors hover:bg-n-50"
                  onClick={() => setExpanded(expanded === score.call_id ? null : score.call_id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white ${
                      score.total_score >= 70 ? "bg-success-500" : score.total_score >= 50 ? "bg-warning-500" : "bg-danger-500"
                    }`}>
                      {Math.round(score.total_score)}
                    </div>
                    <div>
                      <p className="font-semibold text-n-900">{score.original_filename}</p>
                      <p className="text-sm text-n-500">Agent: {score.agent_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {score.mandatory_passed
                      ? <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" />Compliant</Badge>
                      : <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Non-compliant</Badge>}
                    {score.critical_flags > 0 && (
                      <Badge variant="destructive">
                        <AlertTriangle className="mr-1 h-3 w-3" />{score.critical_flags} critical
                      </Badge>
                    )}
                    {expanded === score.call_id
                      ? <ChevronUp className="h-5 w-5 text-n-400" />
                      : <ChevronDown className="h-5 w-5 text-n-400" />}
                  </div>
                </div>

                {expanded === score.call_id && detail?.breakdown && (
                  <div className="border-t border-n-100 bg-n-50 p-6 space-y-6">
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-n-700">Compliance Rules</h3>
                      <div className="space-y-2">
                        {detail.breakdown.rule_results?.map((rule, i) => (
                          <div key={i} className="flex items-start justify-between rounded-lg border border-n-200 bg-white p-3">
                            <div className="flex items-start gap-3">
                              {rule.passed
                                ? <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-success-500" />
                                : <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-500" />}
                              <div>
                                <p className="text-sm font-medium text-n-800">{rule.rule_name}</p>
                                <p className="text-xs text-n-500">{rule.evidence}</p>
                              </div>
                            </div>
                            <Badge variant={rule.passed ? "success" : "destructive"}>
                              {rule.score} pts
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {detail.breakdown.flags?.length > 0 && (
                      <div>
                        <h3 className="mb-3 text-sm font-semibold text-danger-700">Compliance Flags</h3>
                        <div className="space-y-2">
                          {detail.breakdown.flags.map((flag, i) => (
                            <div key={i} className={`rounded-lg border p-3 ${
                              flag.severity === "critical" ? "border-danger-100 bg-danger-50" :
                              flag.severity === "warning" ? "border-warning-100 bg-warning-50" : "border-brand-100 bg-brand-50"
                            }`}>
                              <div className="flex items-center gap-2">
                                <Badge variant={flag.severity === "critical" ? "destructive" : "warning"}>
                                  {flag.severity}
                                </Badge>
                                <span className="text-sm font-medium text-n-800">{flag.issue}</span>
                              </div>
                              <p className="mt-1 text-xs text-n-600">{flag.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {detail.breakdown.positive_notes?.length > 0 && (
                      <div>
                        <h3 className="mb-3 text-sm font-semibold text-success-700">Positive Notes</h3>
                        <ul className="space-y-1">
                          {detail.breakdown.positive_notes.map((note, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-n-600">
                              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-500" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
