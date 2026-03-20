"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { api, type InsightsResponse } from "@/lib/api";
import { sentimentColor } from "@/lib/utils";

const COLORS = ["#2544EB", "#FF5513", "#0CA678", "#F08C00", "#7B93B2", "#1D35D8", "#E8390A"];

export default function AnalysisPage() {
  const { data: insights, isLoading } = useQuery<InsightsResponse>({
    queryKey: ["insights"],
    queryFn: api.analysis.insights,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-n-200 border-t-brand-600" />
      </div>
    );
  }

  if (!insights || insights.total_calls === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <p className="text-lg font-medium text-n-500">No analyzed calls yet</p>
        <p className="text-sm text-n-400">Upload and process calls first</p>
      </div>
    );
  }

  const intentData = Object.entries(insights.intent_breakdown).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value,
  }));

  const outcomeData = Object.entries(insights.outcome_breakdown).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-n-900">Call Analysis</h1>
        <p className="mt-1 text-n-500">
          Insights from {insights.total_calls} analyzed calls
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-l-4 border-l-brand-500">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-n-500">Total Calls</p>
            <p className="mt-1 text-3xl font-bold text-n-900">{insights.total_calls}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent-500">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-n-500">Avg Quality Score</p>
            <p className="mt-1 text-3xl font-bold text-n-900">{insights.avg_quality_score}/10</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-success-500">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-n-500">Avg Sentiment</p>
            <p className={`mt-1 text-3xl font-bold ${sentimentColor(insights.avg_sentiment)}`}>
              {insights.avg_sentiment.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning-500">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-n-500">Sales Conversion</p>
            <p className="mt-1 text-3xl font-bold text-n-900">
              {insights.outcome_breakdown["sale_made"]
                ? `${Math.round(
                    (insights.outcome_breakdown["sale_made"] / insights.total_calls) * 100
                  )}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="objections">
        <TabsList>
          <TabsTrigger value="objections">Customer Objections</TabsTrigger>
          <TabsTrigger value="tactics">Agent Tactics</TabsTrigger>
          <TabsTrigger value="agents">Agent Comparison</TabsTrigger>
          <TabsTrigger value="breakdown">Intent &amp; Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="objections">
          <Card>
            <CardHeader>
              <CardTitle>Most Common Customer Objections</CardTitle>
              <p className="text-sm text-n-500">
                Objections and concerns raised across all calls
              </p>
            </CardHeader>
            <CardContent>
              {insights.all_objections.length > 0 ? (
                <div className="space-y-3">
                  {insights.all_objections.map((obj, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-danger-100 bg-danger-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-danger-200 text-xs font-bold text-danger-800">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-danger-900">{obj.objection}</span>
                      </div>
                      <Badge variant="destructive">
                        {obj.count} call{obj.count > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-n-400">No objections recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tactics">
          <Card>
            <CardHeader>
              <CardTitle>Agent Sales Tactics</CardTitle>
              <p className="text-sm text-n-500">
                Approaches and techniques agents used across calls
              </p>
            </CardHeader>
            <CardContent>
              {insights.all_tactics.length > 0 ? (
                <div className="space-y-3">
                  {insights.all_tactics.map((tac, i) => {
                    const maxCount = insights.all_tactics[0].count;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-n-700">{tac.tactic}</span>
                          <span className="text-xs text-n-500">
                            used in {tac.count} call{tac.count > 1 ? "s" : ""}
                          </span>
                        </div>
                        <Progress
                          value={(tac.count / maxCount) * 100}
                          className="h-2"
                          indicatorClassName="bg-success-500"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-n-400">No tactics recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insights.agent_insights.map((agent, i) => (
              <Card key={i} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                        {agent.agent_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.agent_name}</CardTitle>
                        {agent.company && (
                          <p className="text-xs text-n-500">{agent.company}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        agent.avg_quality >= 7 ? "success" : agent.avg_quality >= 4 ? "warning" : "destructive"
                      }
                    >
                      {agent.avg_quality}/10
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-n-500">Calls</p>
                      <p className="text-lg font-bold text-n-900">{agent.total_calls}</p>
                    </div>
                    <div>
                      <p className="text-xs text-n-500">Sentiment</p>
                      <p className={`text-lg font-bold ${sentimentColor(agent.avg_sentiment)}`}>
                        {agent.avg_sentiment.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium text-n-500">Outcomes</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(agent.outcomes).map(([outcome, count]) => (
                        <Badge key={outcome} variant="secondary" className="text-xs">
                          {outcome.replace(/_/g, " ")}: {count as number}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {agent.top_tactics.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-n-500">Top Tactics</p>
                      <ul className="space-y-1">
                        {agent.top_tactics.slice(0, 3).map((t, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-n-600">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success-400" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {insights.agent_insights.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-n-400">
                  No agent data available
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Intent</CardTitle>
                <p className="text-sm text-n-500">What customers were looking for</p>
              </CardHeader>
              <CardContent>
                {intentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={intentData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={(props) =>
                          `${props.name ?? ""} (${(((props.percent as number) ?? 0) * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {intentData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #E3EAF2",
                          boxShadow: "0 4px 12px rgba(11,17,32,0.08)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-n-400">No data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Call Outcomes</CardTitle>
                <p className="text-sm text-n-500">How calls ended (per GPT analysis)</p>
              </CardHeader>
              <CardContent>
                {outcomeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={outcomeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3EAF2" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #E3EAF2",
                          boxShadow: "0 4px 12px rgba(11,17,32,0.08)",
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {outcomeData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-n-400">No data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
