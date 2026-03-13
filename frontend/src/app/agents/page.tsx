"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Phone, TrendingUp, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api, type AgentStats } from "@/lib/api";
import { formatPercent, sentimentColor } from "@/lib/utils";

export default function AgentsPage() {
  const { data: stats, isLoading } = useQuery<AgentStats[]>({
    queryKey: ["agent-stats"],
    queryFn: api.agents.stats,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Agents</h1>
        <p className="mt-1 text-slate-500">
          Agent performance auto-detected from call transcripts
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : (
        <>
          {stats && stats.length > 0 && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-slate-500">Total Agents</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{stats.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-slate-500">Total Calls</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {stats.reduce((acc, s) => acc + s.total_calls, 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-slate-500">Avg Conversion</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {formatPercent(
                      stats.reduce((acc, s) => acc + s.conversion_rate, 0) / Math.max(stats.length, 1)
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-slate-500">Avg Sentiment</p>
                  {(() => {
                    const sents = stats.filter((s) => s.avg_sentiment !== null);
                    const avg = sents.length
                      ? sents.reduce((acc, s) => acc + (s.avg_sentiment ?? 0), 0) / sents.length
                      : 0;
                    return (
                      <p className={`mt-1 text-3xl font-bold ${sentimentColor(avg)}`}>
                        {avg.toFixed(2)}
                      </p>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats?.filter((a) => a.total_calls > 0).map((agent) => (
              <Card key={agent.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <div className="rounded-lg bg-slate-100 p-2">
                      <Users className="h-4 w-4 text-slate-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Calls</p>
                        <p className="text-xl font-bold text-slate-900">{agent.total_calls}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="text-xs text-slate-500">Purchases</p>
                        <p className="text-xl font-bold text-emerald-600">{agent.purchases}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Conversion Rate</span>
                      <span className="font-semibold">{formatPercent(agent.conversion_rate)}</span>
                    </div>
                    <Progress value={agent.conversion_rate * 100} className="mt-1" indicatorClassName="bg-emerald-500" />
                  </div>

                  {agent.avg_sentiment !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Avg Sentiment</span>
                      <span className={`font-semibold ${sentimentColor(agent.avg_sentiment)}`}>
                        {agent.avg_sentiment.toFixed(2)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {(!stats || stats.filter((a) => a.total_calls > 0).length === 0) && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-lg font-medium text-slate-500">No agents detected yet</p>
                  <p className="text-sm text-slate-400">
                    Upload call recordings and agents will be auto-detected from transcripts
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
