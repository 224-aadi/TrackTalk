from pydantic import BaseModel


class CorrelationResult(BaseModel):
    feature: str
    correlation: float
    p_value: float | None = None


class CorrelationResponse(BaseModel):
    correlations: list[CorrelationResult]
    total_calls: int
    purchase_calls: int
    no_purchase_calls: int


class WinningPhrase(BaseModel):
    phrase: str
    purchase_frequency: float
    no_purchase_frequency: float
    lift: float


class PatternResponse(BaseModel):
    winning_phrases: list[WinningPhrase]
    losing_phrases: list[WinningPhrase]


class ComparisonStats(BaseModel):
    metric: str
    purchase_mean: float
    no_purchase_mean: float
    difference: float
    significant: bool


class ComparisonResponse(BaseModel):
    stats: list[ComparisonStats]
    total_purchase: int
    total_no_purchase: int


class DashboardMetrics(BaseModel):
    total_calls: int
    total_transcribed: int
    total_analyzed: int
    avg_sentiment: float | None
    conversion_rate: float | None
    top_keywords: list[dict]
    sentiment_trend: list[dict]
    outcome_distribution: dict
    calls_per_day: list[dict]


class AgentInsight(BaseModel):
    agent_name: str
    company: str | None
    total_calls: int
    avg_quality: float
    avg_sentiment: float
    outcomes: dict
    top_tactics: list[str]


class InsightsResponse(BaseModel):
    total_calls: int
    avg_quality_score: float
    avg_sentiment: float
    intent_breakdown: dict
    outcome_breakdown: dict
    all_objections: list[dict]
    all_tactics: list[dict]
    agent_insights: list[AgentInsight]
    quality_distribution: dict
