"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Brain, Target, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { BACKEND_ORIGIN } from "@/lib/api";
const API = `${BACKEND_ORIGIN}/api`;

function plural(count: number, singular: string, pluralForm?: string) {
  return count === 1 ? `${count} ${singular}` : `${count} ${pluralForm || singular + "s"}`;
}

interface AgentTraining {
  id: string;
  name: string;
  team: string | null;
  call_count: number;
  has_recommendations: boolean;
  coaching_sessions: number;
}

interface Recommendations {
  agent_id: string;
  agent_name: string;
  recommendations: {
    skill_gaps: { skill: string; evidence: string; priority: string }[];
    training_plan: { step: number; title: string; description: string; duration_estimate: string }[];
    practice_scenarios: { scenario: string; customer_type: string; objective: string }[];
    strengths_to_leverage: (string | { strength?: string })[];
    overall_assessment: string;
  };
}

export default function TrainingPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: agents, isLoading } = useQuery<AgentTraining[]>({
    queryKey: ["training-agents"],
    queryFn: () => fetch(`${API}/training/agents`).then((r) => r.json()),
  });

  const generateRecs = useMutation({
    mutationFn: (agentId: string) =>
      fetch(`${API}/training/recommendations/${agentId}`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (_data, agentId) => {
      queryClient.invalidateQueries({ queryKey: ["training-agents"] });
      queryClient.invalidateQueries({ queryKey: ["training-recs", agentId] });
      setExpanded(agentId);
    },
  });

  const { data: recs } = useQuery<Recommendations | null>({
    queryKey: ["training-recs", expanded],
    queryFn: async () => {
      const r = await fetch(`${API}/training/recommendations/${expanded}`);
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!expanded,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-n-900">Training Portal</h1>
        <p className="mt-1 text-n-500">
          Personalized training recommendations for each agent
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-n-200 border-t-brand-600" />
        </div>
      ) : !agents || agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GraduationCap className="h-12 w-12 text-n-300" />
            <p className="mt-4 text-lg font-medium text-n-500">No agents to train</p>
            <p className="text-sm text-n-400">Upload and process calls first</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const isExpanded = expanded === agent.id;
            const isGenerating = generateRecs.isPending && generateRecs.variables === agent.id;

            return (
              <Card key={agent.id} className="overflow-hidden">
                <div
                  className="flex cursor-pointer items-center justify-between p-5 transition-colors hover:bg-n-50"
                  onClick={() => setExpanded(isExpanded ? null : agent.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-n-900">{agent.name}</p>
                      <p className="text-sm text-n-500">
                        {agent.team || "Unknown company"}
                        <span className="mx-1.5 text-n-300">&middot;</span>
                        {plural(agent.call_count, "call")}
                        <span className="mx-1.5 text-n-300">&middot;</span>
                        {plural(agent.coaching_sessions, "coaching session")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {agent.has_recommendations ? (
                      <Badge variant="success">Has plan</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateRecs.mutate(agent.id);
                        }}
                        disabled={isGenerating}
                      >
                        <Sparkles className="h-3 w-3" />
                        {isGenerating ? "Generating..." : "Generate Plan"}
                      </Button>
                    )}
                    {isExpanded
                      ? <ChevronUp className="h-5 w-5 text-n-400" />
                      : <ChevronDown className="h-5 w-5 text-n-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-n-100 bg-n-50 p-6">
                    {!recs?.recommendations ? (
                      <div className="py-8 text-center text-n-400">
                        <GraduationCap className="mx-auto h-8 w-8 text-n-300" />
                        <p className="mt-2 text-sm">No training plan yet. Click &ldquo;Generate Plan&rdquo; to create one.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="rounded-lg border border-n-200 bg-white p-4">
                          <p className="text-sm text-n-700 leading-relaxed">{recs.recommendations.overall_assessment}</p>
                        </div>

                        {recs.recommendations.skill_gaps?.length > 0 && (
                          <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-danger-600">
                              <Target className="h-4 w-4" /> Skill Gaps
                            </h3>
                            <div className="space-y-2">
                              {recs.recommendations.skill_gaps.map((gap, i) => (
                                <div key={i} className="rounded-lg border border-n-200 bg-white p-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-n-800">{gap.skill}</p>
                                    <Badge variant={gap.priority === "high" ? "destructive" : gap.priority === "medium" ? "warning" : "secondary"}>
                                      {gap.priority}
                                    </Badge>
                                  </div>
                                  <p className="mt-1 text-xs text-n-500">{gap.evidence}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {recs.recommendations.training_plan?.length > 0 && (
                          <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-700">
                              <GraduationCap className="h-4 w-4" /> Training Plan
                            </h3>
                            <div className="space-y-2">
                              {recs.recommendations.training_plan.map((step, i) => (
                                <div key={i} className="flex gap-3 rounded-lg border border-n-200 bg-white p-3">
                                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                                    {i + 1}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-n-800">{step.title}</p>
                                      <span className="text-xs text-n-400">{step.duration_estimate}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-n-500">{step.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {recs.recommendations.practice_scenarios?.length > 0 && (
                          <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent-700">
                              <Brain className="h-4 w-4" /> Practice Scenarios
                            </h3>
                            <div className="space-y-2">
                              {recs.recommendations.practice_scenarios.map((sc, i) => (
                                <div key={i} className="rounded-lg border border-accent-100 bg-white p-3">
                                  <p className="text-sm font-medium text-n-800">{sc.scenario}</p>
                                  <div className="mt-2 flex gap-2">
                                    <Badge variant="secondary">Customer: {sc.customer_type}</Badge>
                                    <Badge variant="secondary">Goal: {sc.objective}</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {recs.recommendations.strengths_to_leverage?.length > 0 && (
                          <div>
                            <h3 className="mb-3 text-sm font-semibold text-success-700">Strengths to Build On</h3>
                            <ul className="space-y-1">
                              {recs.recommendations.strengths_to_leverage.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-n-600">
                                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-success-500" />
                                  {typeof s === "string" ? s : (s as { strength?: string }).strength || JSON.stringify(s)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
