"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  BrainCircuit,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api, BACKEND_ORIGIN, type CallWithDetails } from "@/lib/api";
import { formatDate, formatDuration, sentimentColor, sentimentBg, outcomeColor } from "@/lib/utils";

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const callId = params.id as string;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const { data: call, isLoading } = useQuery<CallWithDetails>({
    queryKey: ["call", callId],
    queryFn: () => api.calls.get(callId),
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d && ["uploaded", "transcribing", "analyzing"].includes(d.status)) return 3000;
      return false;
    },
  });

  const predictMutation = useMutation({
    mutationFn: () => api.predictions.predict(callId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["call", callId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.calls.delete(callId),
    onSuccess: () => router.push("/calls"),
  });

  const updateOutcome = useMutation({
    mutationFn: (outcome: string) => api.calls.update(callId, { outcome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["call", callId] }),
  });

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-n-200 border-t-brand-600" />
      </div>
    );
  }

  if (!call) {
    return <div className="p-8 text-n-500">Call not found</div>;
  }

  const keywords = call.analysis?.keywords?.keywords || [];
  const segments = call.transcript?.segments?.segments || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/calls")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-n-900">{call.original_filename}</h1>
          <p className="mt-0.5 text-sm text-n-500">
            {formatDate(call.created_at)} &middot; {formatDuration(call.duration_seconds)}
          </p>
        </div>
        <Badge className={outcomeColor(call.outcome)}>{call.outcome.replace("_", " ")}</Badge>
        <Badge variant={call.status === "analyzed" ? "success" : "secondary"}>{call.status}</Badge>
      </div>

      <div className="flex gap-3">
        <select
          value={call.outcome}
          onChange={(e) => updateOutcome.mutate(e.target.value)}
          className="rounded-lg border-n-200 bg-white px-3 py-2 text-sm text-n-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
        >
          <option value="pending">Pending</option>
          <option value="purchase">Purchase</option>
          <option value="no_purchase">No Purchase</option>
        </select>
        {call.analysis && !call.prediction && (
          <Button
            variant="outline"
            onClick={() => predictMutation.mutate()}
            disabled={predictMutation.isPending}
          >
            <BrainCircuit className="h-4 w-4" />
            {predictMutation.isPending ? "Predicting..." : "Run Prediction"}
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      {call.audio_file_path && (
        <div className="rounded-xl bg-n-50 p-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <audio
              ref={audioRef}
              src={`${BACKEND_ORIGIN}/static/uploads/${call.audio_file_path.split("/").pop()}`}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onEnded={() => setIsPlaying(false)}
            />
            <span className="text-sm text-n-500">
              {formatDuration(currentTime)} / {formatDuration(call.duration_seconds)}
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="transcript">
        <TabsList>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          {call.prediction && <TabsTrigger value="prediction">Prediction</TabsTrigger>}
        </TabsList>

        <TabsContent value="transcript">
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              {call.transcript ? (
                <div className="space-y-1">
                  {segments.length > 0 ? (
                    segments.map((seg, i) => (
                      <div
                        key={i}
                        onClick={() => seekTo(seg.start)}
                        className="cursor-pointer rounded-lg px-3 py-2.5 transition-colors hover:bg-brand-50"
                      >
                        <span className="mr-3 text-xs font-mono text-n-400">
                          {formatDuration(seg.start)}
                        </span>
                        <span className="text-n-700">{seg.text}</span>
                      </div>
                    ))
                  ) : (
                    <p className="whitespace-pre-wrap text-n-700 leading-relaxed">
                      {call.transcript.full_text}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-n-400">
                  {["uploaded", "transcribing"].includes(call.status)
                    ? "Transcription in progress..."
                    : "No transcript available"}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          {call.analysis ? (
          <div className="space-y-6">
            {call.analysis.topics && (call.analysis.topics as Record<string, unknown>).summary ? (
              <Card>
                <CardHeader>
                  <CardTitle>Call Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-n-700 leading-relaxed">
                    {String((call.analysis.topics as Record<string, unknown>).summary)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(call.analysis.topics as Record<string, unknown>).customer_intent ? (
                      <div>
                        <span className="text-xs font-medium text-n-500">Customer Intent</span>
                        <Badge variant="secondary" className="ml-2">
                          {String((call.analysis.topics as Record<string, unknown>).customer_intent)}
                        </Badge>
                      </div>
                    ) : null}
                    {(call.analysis.topics as Record<string, unknown>).call_outcome ? (
                      <div>
                        <span className="text-xs font-medium text-n-500">Outcome</span>
                        <Badge variant="secondary" className="ml-2">
                          {String((call.analysis.topics as Record<string, unknown>).call_outcome).replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ) : null}
                    {(call.analysis.topics as Record<string, unknown>).quality_score ? (
                      <div>
                        <span className="text-xs font-medium text-n-500">Agent Quality</span>
                        <Badge
                          variant={Number((call.analysis.topics as Record<string, unknown>).quality_score) >= 7 ? "success" : Number((call.analysis.topics as Record<string, unknown>).quality_score) >= 4 ? "warning" : "destructive"}
                          className="ml-2"
                        >
                          {String((call.analysis.topics as Record<string, unknown>).quality_score)}/10
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sentiment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full ${sentimentBg(call.analysis.sentiment_score)}`}>
                      <span className={`text-2xl font-bold ${sentimentColor(call.analysis.sentiment_score)}`}>
                        {call.analysis.sentiment_score?.toFixed(2) ?? "—"}
                      </span>
                    </div>
                    <Badge
                      variant={
                        call.analysis.sentiment_label === "POSITIVE" ? "success"
                          : call.analysis.sentiment_label === "NEGATIVE" ? "destructive"
                          : "warning"
                      }
                    >
                      {call.analysis.sentiment_label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  {keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((kw) => (
                        <Badge
                          key={kw.keyword}
                          className={kw.score >= 0.8 ? "bg-brand-50 text-brand-700" : "bg-n-100 text-n-600"}
                        >
                          {kw.keyword}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-n-400">No keywords extracted</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {call.analysis.entities ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {((call.analysis.entities as Record<string, unknown>).objections_raised as string[] | undefined)?.length ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Objections Raised</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {((call.analysis.entities as Record<string, unknown>).objections_raised as string[]).map((obj, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-danger-400" />
                            <span className="text-sm text-n-700">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}

                {((call.analysis.entities as Record<string, unknown>).agent_tactics as string[] | undefined)?.length ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Agent Tactics Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {((call.analysis.entities as Record<string, unknown>).agent_tactics as string[]).map((tactic, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-success-400" />
                            <span className="text-sm text-n-700">{tactic}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}
          </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-n-400">
                {["uploaded", "transcribing", "analyzing"].includes(call.status)
                  ? "Analysis in progress..."
                  : "No analysis available"}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {call.prediction && (
          <TabsContent value="prediction">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Probability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative h-32 w-32">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" className="stroke-n-200" strokeWidth="8" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          className={call.prediction.purchase_probability >= 0.5 ? "stroke-brand-600" : "stroke-danger-500"}
                          strokeWidth="8"
                          strokeDasharray={`${call.prediction.purchase_probability * 251.2} 251.2`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-n-900">
                          {(call.prediction.purchase_probability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <Badge variant={call.prediction.predicted_outcome === "purchase" ? "success" : "destructive"}>
                        {call.prediction.predicted_outcome.replace("_", " ")}
                      </Badge>
                      <p className="mt-2 text-sm text-n-500">
                        Model: {call.prediction.model_version}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Contributing Features</CardTitle>
                </CardHeader>
                <CardContent>
                  {call.prediction.feature_importance?.features ? (
                    <div className="space-y-2">
                      {call.prediction.feature_importance.features.slice(0, 10).map((f) => {
                        const value = f.shap_value ?? f.importance ?? 0;
                        const maxVal = Math.max(
                          ...call.prediction!.feature_importance!.features!.slice(0, 10).map(
                            (x) => Math.abs(x.shap_value ?? x.importance ?? 0)
                          )
                        );
                        const width = Math.abs(value) / (maxVal || 1) * 100;
                        return (
                          <div key={f.feature} className="flex items-center gap-3">
                            <span className="w-40 truncate text-sm text-n-600">
                              {f.feature.replace(/_/g, " ")}
                            </span>
                            <div className="flex-1 h-5 bg-n-100 rounded overflow-hidden">
                              <div
                                className={`h-full rounded ${value >= 0 ? "bg-brand-400" : "bg-danger-400"}`}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                            <span className="w-16 text-right text-sm font-mono text-n-700">
                              {value.toFixed(3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-n-400">No feature importance data</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
