const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
/** Base URL of the backend (no /api), for static files e.g. /static/uploads/ */
export const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return res.json();
}

// Calls
export const api = {
  calls: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<CallListResponse>(`/calls/${qs}`);
    },
    get: (id: string) => request<CallWithDetails>(`/calls/${id}`),
    upload: (formData: FormData) =>
      request<CallResponse>("/calls/upload", { method: "POST", body: formData }),
    update: (id: string, data: Record<string, unknown>) =>
      request<CallResponse>(`/calls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ detail: string }>(`/calls/${id}`, { method: "DELETE" }),
    retranscribe: (id: string) =>
      request<{ detail: string }>(`/calls/${id}/retranscribe`, { method: "POST" }),
  },

  analysis: {
    dashboard: () => request<DashboardMetrics>("/analysis/dashboard"),
    correlations: () => request<CorrelationResponse>("/analysis/correlations"),
    patterns: () => request<PatternResponse>("/analysis/patterns"),
    compare: () => request<ComparisonResponse>("/analysis/compare"),
    insights: () => request<InsightsResponse>("/analysis/insights"),
  },

  predictions: {
    train: (data?: { test_size?: number; model_type?: string }) =>
      request<TrainResponse>("/predictions/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data || {}),
      }),
    predict: (callId: string) =>
      request<PredictResponse>(`/predictions/predict/${callId}`, { method: "POST" }),
    predictBatch: () =>
      request<BatchPredictResponse>("/predictions/predict-batch", { method: "POST" }),
    listModels: () => request<ModelVersionResponse[]>("/predictions/models"),
    getModelMetrics: (version: string) =>
      request<ModelMetricsDetail>(`/predictions/models/${version}/metrics`),
    activateModel: (version: string) =>
      request<{ detail: string }>(`/predictions/models/${version}/activate`, {
        method: "POST",
      }),
  },

  agents: {
    list: () => request<AgentResponse[]>("/agents/"),
    create: (data: { name: string; email?: string; team?: string }) =>
      request<AgentResponse>("/agents/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    stats: () => request<AgentStats[]>("/agents/stats"),
  },
};

// Types
export interface CallResponse {
  id: string;
  agent_id: string | null;
  audio_file_path: string;
  original_filename: string;
  duration_seconds: number | null;
  call_date: string | null;
  outcome: string;
  status: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CallListResponse {
  calls: CallResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface TranscriptResponse {
  id: string;
  full_text: string;
  segments: { segments?: Segment[]; words?: Word[] } | null;
  language: string | null;
  confidence: number | null;
  word_count: number | null;
  created_at: string;
}

export interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface AnalysisResponse {
  id: string;
  sentiment_score: number | null;
  sentiment_label: string | null;
  keywords: { keywords?: { keyword: string; score: number }[] } | null;
  topics: unknown;
  entities: unknown;
  features: Record<string, number> | null;
  created_at: string;
}

export interface PredictionResponse {
  id: string;
  purchase_probability: number;
  predicted_outcome: string;
  feature_importance: { features?: FeatureImportance[] } | null;
  model_version: string;
  created_at: string;
}

export interface FeatureImportance {
  feature: string;
  shap_value?: number;
  importance?: number;
}

export interface CallWithDetails extends CallResponse {
  transcript: TranscriptResponse | null;
  analysis: AnalysisResponse | null;
  prediction: PredictionResponse | null;
}

export interface DashboardMetrics {
  total_calls: number;
  total_transcribed: number;
  total_analyzed: number;
  avg_sentiment: number | null;
  conversion_rate: number | null;
  top_keywords: { keyword: string; count: number }[];
  sentiment_trend: { date: string; sentiment: number }[];
  outcome_distribution: Record<string, number>;
  calls_per_day: { date: string; count: number }[];
}

export interface CorrelationResult {
  feature: string;
  correlation: number;
  p_value?: number;
}

export interface CorrelationResponse {
  correlations: CorrelationResult[];
  total_calls: number;
  purchase_calls: number;
  no_purchase_calls: number;
}

export interface WinningPhrase {
  phrase: string;
  purchase_frequency: number;
  no_purchase_frequency: number;
  lift: number;
}

export interface PatternResponse {
  winning_phrases: WinningPhrase[];
  losing_phrases: WinningPhrase[];
}

export interface ComparisonStats {
  metric: string;
  purchase_mean: number;
  no_purchase_mean: number;
  difference: number;
  significant: boolean;
}

export interface ComparisonResponse {
  stats: ComparisonStats[];
  total_purchase: number;
  total_no_purchase: number;
}

export interface AgentInsight {
  agent_name: string;
  company: string | null;
  total_calls: number;
  avg_quality: number;
  avg_sentiment: number;
  outcomes: Record<string, number>;
  top_tactics: string[];
}

export interface InsightsResponse {
  total_calls: number;
  avg_quality_score: number;
  avg_sentiment: number;
  intent_breakdown: Record<string, number>;
  outcome_breakdown: Record<string, number>;
  all_objections: { objection: string; count: number }[];
  all_tactics: { tactic: string; count: number }[];
  agent_insights: AgentInsight[];
  quality_distribution: Record<string, number>;
}

export interface TrainResponse {
  model_version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
  training_samples: number;
  test_samples: number;
  feature_names: string[];
}

export interface PredictResponse {
  call_id: string;
  purchase_probability: number;
  predicted_outcome: string;
  feature_importance: FeatureImportance[];
  model_version: string;
}

export interface BatchPredictResponse {
  predicted: number;
  skipped: number;
  errors: number;
}

export interface ModelVersionResponse {
  id: string;
  version: string;
  accuracy: number | null;
  precision_score: number | null;
  recall_score: number | null;
  f1_score: number | null;
  auc_score: number | null;
  is_active: boolean;
  training_samples: number | null;
  created_at: string;
}

export interface ModelMetricsDetail {
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
  confusion_matrix: number[][];
  roc_curve: { fpr: number[]; tpr: number[]; thresholds: number[] };
  feature_importance: { feature: string; importance: number }[];
}

export interface AgentResponse {
  id: string;
  name: string;
  email: string | null;
  team: string | null;
  created_at: string;
}

export interface AgentStats {
  id: string;
  name: string;
  total_calls: number;
  purchases: number;
  conversion_rate: number;
  avg_sentiment: number | null;
}
