"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Play, Star, AlertTriangle, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const API = "http://localhost:8000/api";

interface CoachingSession {
  id: string;
  call_id: string;
  agent_name: string;
  original_filename: string;
  overall_rating: number;
  training_tags: string[];
  created_at: string;
}

interface CoachingDetail {
  id: string;
  call_id: string;
  agent_name: string;
  coaching: {
    overall_rating: number;
    strengths: { point: string; example: string }[];
    improvements: { issue: string; why_it_matters: string; suggestion: string }[];
    objection_handling: { objection: string; agent_response: string; better_response: string; technique: string }[];
    recommended_script: string;
    key_moment: { timestamp_hint: string; what_happened: string; what_should_have_happened: string };
    training_tags: string[];
  };
}

export default function CoachingPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery<CoachingSession[]>({
    queryKey: ["coaching-sessions"],
    queryFn: () => fetch(`${API}/coaching/`).then((r) => r.json()),
  });

  const generateAll = useMutation({
    mutationFn: () => fetch(`${API}/coaching/generate-all`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coaching-sessions"] }),
  });

  const { data: detail } = useQuery<CoachingDetail>({
    queryKey: ["coaching-detail", expanded],
    queryFn: () => fetch(`${API}/coaching/${expanded}`).then((r) => r.json()),
    enabled: !!expanded,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Call Coaching</h1>
          <p className="mt-1 text-slate-500">AI-powered coaching feedback for every call</p>
        </div>
        <Button onClick={() => generateAll.mutate()} disabled={generateAll.isPending}>
          <Play className="h-4 w-4" />
          {generateAll.isPending ? "Generating..." : "Generate All Coaching"}
        </Button>
      </div>

      {generateAll.isSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Generated coaching for {(generateAll.data as { generated: number }).generated} calls
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-500">No coaching sessions yet</p>
            <p className="text-sm text-slate-400">
              Click &ldquo;Generate All Coaching&rdquo; to create coaching reports for all analyzed calls
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} className="overflow-hidden">
              <div
                className="flex cursor-pointer items-center justify-between p-6"
                onClick={() => setExpanded(expanded === session.call_id ? null : session.call_id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${
                    session.overall_rating >= 7 ? "bg-emerald-500" : session.overall_rating >= 4 ? "bg-amber-500" : "bg-red-500"
                  }`}>
                    {session.overall_rating}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{session.original_filename}</p>
                    <p className="text-sm text-slate-500">Agent: {session.agent_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-wrap gap-1">
                    {session.training_tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  {expanded === session.call_id
                    ? <ChevronUp className="h-5 w-5 text-slate-400" />
                    : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </div>
              </div>

              {expanded === session.call_id && detail?.coaching && (
                <div className="border-t border-slate-100 bg-slate-50 p-6 space-y-6">
                  {/* Strengths */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <Star className="h-4 w-4" /> Strengths
                    </h3>
                    <div className="space-y-2">
                      {detail.coaching.strengths.map((s, i) => (
                        <div key={i} className="rounded-lg border border-emerald-100 bg-white p-3">
                          <p className="text-sm font-medium text-slate-800">{s.point}</p>
                          {s.example && <p className="mt-1 text-xs italic text-slate-500">&ldquo;{s.example}&rdquo;</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Improvements */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
                      <AlertTriangle className="h-4 w-4" /> Areas for Improvement
                    </h3>
                    <div className="space-y-2">
                      {detail.coaching.improvements.map((imp, i) => (
                        <div key={i} className="rounded-lg border border-amber-100 bg-white p-3">
                          <p className="text-sm font-medium text-slate-800">{imp.issue}</p>
                          <p className="mt-1 text-xs text-slate-500">{imp.why_it_matters}</p>
                          <p className="mt-1 text-xs font-medium text-amber-700">Suggestion: {imp.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Objection handling */}
                  {detail.coaching.objection_handling?.length > 0 && (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700">
                        <MessageSquare className="h-4 w-4" /> Objection Handling
                      </h3>
                      <div className="space-y-3">
                        {detail.coaching.objection_handling.map((oh, i) => (
                          <div key={i} className="rounded-lg border border-blue-100 bg-white p-4 space-y-2">
                            <p className="text-sm font-medium text-red-700">Objection: &ldquo;{oh.objection}&rdquo;</p>
                            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                              <div className="rounded bg-red-50 p-2">
                                <p className="text-xs font-medium text-red-600">Agent said:</p>
                                <p className="text-xs text-slate-600">{oh.agent_response}</p>
                              </div>
                              <div className="rounded bg-emerald-50 p-2">
                                <p className="text-xs font-medium text-emerald-600">Better response:</p>
                                <p className="text-xs text-slate-600">{oh.better_response}</p>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500">Technique: <span className="font-medium">{oh.technique}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key moment */}
                  {detail.coaching.key_moment?.what_happened && (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-purple-700">
                        <BookOpen className="h-4 w-4" /> Key Moment
                      </h3>
                      <div className="rounded-lg border border-purple-100 bg-white p-4">
                        <Badge variant="secondary" className="mb-2">{detail.coaching.key_moment.timestamp_hint}</Badge>
                        <p className="text-sm text-slate-700">{detail.coaching.key_moment.what_happened}</p>
                        <p className="mt-2 text-sm font-medium text-purple-700">
                          Should have: {detail.coaching.key_moment.what_should_have_happened}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recommended script */}
                  {detail.coaching.recommended_script && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-slate-700">Recommended Opening Script</h3>
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                          {detail.coaching.recommended_script}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
