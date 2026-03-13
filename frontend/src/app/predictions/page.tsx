"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Play, CheckCircle, Zap } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  api,
  type ModelVersionResponse,
  type ModelMetricsDetail,
} from "@/lib/api";

export default function PredictionsPage() {
  const queryClient = useQueryClient();

  const { data: models, isLoading } = useQuery<ModelVersionResponse[]>({
    queryKey: ["models"],
    queryFn: api.predictions.listModels,
  });

  const activeModel = models?.find((m) => m.is_active);

  const { data: metrics } = useQuery<ModelMetricsDetail>({
    queryKey: ["model-metrics", activeModel?.version],
    queryFn: () => api.predictions.getModelMetrics(activeModel!.version),
    enabled: !!activeModel,
  });

  const trainMutation = useMutation({
    mutationFn: () => api.predictions.train({ test_size: 0.2 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["model-metrics"] });
    },
  });

  const batchMutation = useMutation({
    mutationFn: api.predictions.predictBatch,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Predictions</h1>
          <p className="mt-1 text-slate-500">Train models and predict call outcomes</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => batchMutation.mutate()}
            disabled={batchMutation.isPending || !activeModel}
          >
            <Zap className="h-4 w-4" />
            {batchMutation.isPending ? "Running..." : "Batch Predict"}
          </Button>
          <Button
            onClick={() => trainMutation.mutate()}
            disabled={trainMutation.isPending}
          >
            <BrainCircuit className="h-4 w-4" />
            {trainMutation.isPending ? "Training..." : "Train New Model"}
          </Button>
        </div>
      </div>

      {trainMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {(trainMutation.error as Error).message}
        </div>
      )}

      {trainMutation.isSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Model trained successfully! Version: {trainMutation.data.model_version} |
          F1: {trainMutation.data.f1.toFixed(3)} | AUC: {trainMutation.data.auc.toFixed(3)}
        </div>
      )}

      {batchMutation.isSuccess && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          Batch prediction complete: {batchMutation.data.predicted} predicted,
          {batchMutation.data.errors} errors
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : !models || models.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-md text-center">
              <BrainCircuit className="mx-auto h-16 w-16 text-slate-300" />
              <h2 className="mt-4 text-xl font-semibold text-slate-800">No Model Trained Yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                To train a predictive model, you need:
              </p>
              <div className="mt-4 space-y-2 text-left">
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-300" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">At least 10 labeled calls</p>
                    <p className="text-xs text-slate-500">
                      Each call needs an outcome: &ldquo;purchase&rdquo; or &ldquo;no_purchase&rdquo;.
                      GPT auto-labels new uploads, or set them manually on the call detail page.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-300" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Both outcome classes</p>
                    <p className="text-xs text-slate-500">
                      Need examples of both successful sales and unsuccessful calls
                      so the model can learn the difference.
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-xs text-slate-400">
                Once you have enough labeled data, click &ldquo;Train New Model&rdquo; above.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="performance">
          <TabsList>
            <TabsTrigger value="performance">Model Performance</TabsTrigger>
            <TabsTrigger value="versions">Model Versions</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            {metrics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                  {[
                    { label: "Accuracy", value: metrics.accuracy },
                    { label: "Precision", value: metrics.precision },
                    { label: "Recall", value: metrics.recall },
                    { label: "F1 Score", value: metrics.f1 },
                    { label: "AUC", value: metrics.auc },
                  ].map((m) => (
                    <Card key={m.label}>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-slate-500">{m.label}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {(m.value * 100).toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>ROC Curve</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {metrics.roc_curve.fpr.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart
                            data={metrics.roc_curve.fpr.map((fpr, i) => ({
                              fpr,
                              tpr: metrics.roc_curve.tpr[i],
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="fpr"
                              label={{ value: "False Positive Rate", position: "bottom" }}
                              tick={{ fontSize: 11 }}
                            />
                            <YAxis
                              dataKey="tpr"
                              label={{ value: "True Positive Rate", angle: -90, position: "insideLeft" }}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                            <Line type="monotone" dataKey="tpr" stroke="#0f172a" strokeWidth={2} dot={false} />
                            <Line
                              type="linear"
                              dataKey="fpr"
                              stroke="#94a3b8"
                              strokeDasharray="5 5"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="py-8 text-center text-slate-400">No ROC data</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Confusion Matrix</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center py-4">
                        <table className="border-collapse text-center">
                          <thead>
                            <tr>
                              <th className="p-3"></th>
                              <th className="p-3 text-sm font-medium text-slate-500">Predicted No</th>
                              <th className="p-3 text-sm font-medium text-slate-500">Predicted Yes</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="p-3 text-sm font-medium text-slate-500">Actual No</td>
                              <td className="p-3">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-100 text-xl font-bold text-emerald-800">
                                  {metrics.confusion_matrix[0]?.[0] ?? 0}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-red-100 text-xl font-bold text-red-800">
                                  {metrics.confusion_matrix[0]?.[1] ?? 0}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 text-sm font-medium text-slate-500">Actual Yes</td>
                              <td className="p-3">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-red-100 text-xl font-bold text-red-800">
                                  {metrics.confusion_matrix[1]?.[0] ?? 0}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-100 text-xl font-bold text-emerald-800">
                                  {metrics.confusion_matrix[1]?.[1] ?? 0}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Feature Importance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics.feature_importance.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(400, metrics.feature_importance.length * 28)}>
                        <BarChart
                          data={metrics.feature_importance.slice(0, 20).map((f) => ({
                            name: f.feature.replace(/_/g, " "),
                            importance: f.importance,
                          }))}
                          layout="vertical"
                          margin={{ left: 140 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={130} />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                          <Bar dataKey="importance" fill="#0f172a" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="py-8 text-center text-slate-400">No feature importance data</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BrainCircuit className="h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-lg font-medium text-slate-500">No model trained yet</p>
                  <p className="text-sm text-slate-400">
                    Label calls as purchase/no_purchase, then click &ldquo;Train New Model&rdquo;
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="versions">
            <Card>
              <CardHeader>
                <CardTitle>Model History</CardTitle>
              </CardHeader>
              <CardContent>
                {models && models.length > 0 ? (
                  <div className="space-y-3">
                    {models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{model.version}</p>
                          <p className="text-sm text-slate-500">
                            {new Date(model.created_at).toLocaleString()} &middot;{" "}
                            {model.training_samples} samples
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600">
                            F1: {((model.f1_score || 0) * 100).toFixed(1)}%
                          </span>
                          <span className="text-sm text-slate-600">
                            AUC: {((model.auc_score || 0) * 100).toFixed(1)}%
                          </span>
                          {model.is_active ? (
                            <Badge variant="success">
                              <CheckCircle className="mr-1 h-3 w-3" /> Active
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                api.predictions.activateModel(model.version).then(() =>
                                  queryClient.invalidateQueries({ queryKey: ["models"] })
                                );
                              }}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-slate-400">No models trained yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
