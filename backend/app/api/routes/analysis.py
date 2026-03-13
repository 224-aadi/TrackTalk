from datetime import datetime, timedelta
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session
import numpy as np

from app.core.database import get_db
from app.models.call import Call
from app.models.transcript import Transcript
from app.models.analysis_result import AnalysisResult
from app.schemas.analysis import (
    DashboardMetrics, CorrelationResponse, CorrelationResult,
    PatternResponse, WinningPhrase, ComparisonResponse, ComparisonStats,
    InsightsResponse, AgentInsight,
)
from app.models.agent import Agent
from app.services.feature_engineering import get_feature_names

router = APIRouter()


@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    total_calls = db.query(Call).count()
    total_transcribed = db.query(Call).filter(Call.status.in_(["transcribed", "analyzed"])).count()
    total_analyzed = db.query(Call).filter(Call.status == "analyzed").count()

    avg_sentiment = db.query(func.avg(AnalysisResult.sentiment_score)).scalar()

    purchase_count = db.query(Call).filter(Call.outcome == "purchase").count()
    labeled_count = db.query(Call).filter(Call.outcome.in_(["purchase", "no_purchase"])).count()
    conversion_rate = round(purchase_count / max(labeled_count, 1), 4) if labeled_count else None

    all_keywords = []
    analyses = db.query(AnalysisResult).filter(AnalysisResult.keywords.isnot(None)).all()
    for a in analyses:
        if a.keywords and "keywords" in a.keywords:
            for kw in a.keywords["keywords"][:5]:
                all_keywords.append(kw["keyword"])
    keyword_counts = Counter(all_keywords)
    top_keywords = [{"keyword": k, "count": c} for k, c in keyword_counts.most_common(15)]

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_sentiment = (
        db.query(
            func.date(Call.created_at).label("date"),
            func.avg(AnalysisResult.sentiment_score).label("avg_sentiment"),
        )
        .join(AnalysisResult, Call.id == AnalysisResult.call_id)
        .filter(Call.created_at >= thirty_days_ago)
        .group_by(func.date(Call.created_at))
        .order_by(func.date(Call.created_at))
        .all()
    )
    sentiment_trend = [
        {"date": str(row.date), "sentiment": round(float(row.avg_sentiment), 4)}
        for row in daily_sentiment
    ]

    outcome_dist = {}
    for outcome, count in db.query(Call.outcome, func.count()).group_by(Call.outcome).all():
        outcome_dist[outcome] = count

    daily_calls = (
        db.query(func.date(Call.created_at).label("date"), func.count().label("count"))
        .filter(Call.created_at >= thirty_days_ago)
        .group_by(func.date(Call.created_at))
        .order_by(func.date(Call.created_at))
        .all()
    )
    calls_per_day = [{"date": str(row.date), "count": row.count} for row in daily_calls]

    return DashboardMetrics(
        total_calls=total_calls,
        total_transcribed=total_transcribed,
        total_analyzed=total_analyzed,
        avg_sentiment=round(float(avg_sentiment), 4) if avg_sentiment else None,
        conversion_rate=conversion_rate,
        top_keywords=top_keywords,
        sentiment_trend=sentiment_trend,
        outcome_distribution=outcome_dist,
        calls_per_day=calls_per_day,
    )


@router.get("/correlations", response_model=CorrelationResponse)
def get_correlations(db: Session = Depends(get_db)):
    """Compute feature-outcome correlations."""
    calls = (
        db.query(Call, AnalysisResult)
        .join(AnalysisResult, Call.id == AnalysisResult.call_id)
        .filter(Call.outcome.in_(["purchase", "no_purchase"]))
        .filter(AnalysisResult.features.isnot(None))
        .all()
    )

    if len(calls) < 5:
        return CorrelationResponse(correlations=[], total_calls=len(calls), purchase_calls=0, no_purchase_calls=0)

    feature_names = get_feature_names()
    features_list = []
    outcomes = []
    for call, analysis in calls:
        feat_vals = [analysis.features.get(fn, 0) for fn in feature_names]
        features_list.append(feat_vals)
        outcomes.append(1 if call.outcome == "purchase" else 0)

    features_arr = np.array(features_list)
    outcomes_arr = np.array(outcomes)

    correlations = []
    for i, fn in enumerate(feature_names):
        col = features_arr[:, i]
        if np.std(col) == 0:
            continue
        corr = float(np.corrcoef(col, outcomes_arr)[0, 1])
        correlations.append(CorrelationResult(feature=fn, correlation=round(corr, 4)))

    correlations.sort(key=lambda x: abs(x.correlation), reverse=True)

    return CorrelationResponse(
        correlations=correlations,
        total_calls=len(calls),
        purchase_calls=int(sum(outcomes)),
        no_purchase_calls=int(len(outcomes) - sum(outcomes)),
    )


@router.get("/patterns", response_model=PatternResponse)
def get_patterns(db: Session = Depends(get_db)):
    """Find phrases that appear more often in successful vs unsuccessful calls."""
    purchase_transcripts = (
        db.query(Transcript.full_text)
        .join(Call, Call.id == Transcript.call_id)
        .filter(Call.outcome == "purchase")
        .all()
    )
    no_purchase_transcripts = (
        db.query(Transcript.full_text)
        .join(Call, Call.id == Transcript.call_id)
        .filter(Call.outcome == "no_purchase")
        .all()
    )

    def count_ngrams(texts, n_range=(2, 4)):
        from sklearn.feature_extraction.text import CountVectorizer
        if not texts:
            return {}
        vectorizer = CountVectorizer(ngram_range=n_range, stop_words="english", max_features=500)
        try:
            matrix = vectorizer.fit_transform(texts)
            freqs = matrix.sum(axis=0).A1
            names = vectorizer.get_feature_names_out()
            total = len(texts)
            return {name: freq / total for name, freq in zip(names, freqs)}
        except Exception:
            return {}

    p_texts = [t[0] for t in purchase_transcripts if t[0]]
    np_texts = [t[0] for t in no_purchase_transcripts if t[0]]

    p_freqs = count_ngrams(p_texts)
    np_freqs = count_ngrams(np_texts)

    all_phrases = set(p_freqs.keys()) | set(np_freqs.keys())
    winning = []
    losing = []

    for phrase in all_phrases:
        pf = p_freqs.get(phrase, 0)
        npf = np_freqs.get(phrase, 0)
        lift = pf / max(npf, 0.001)

        item = WinningPhrase(
            phrase=phrase,
            purchase_frequency=round(float(pf), 4),
            no_purchase_frequency=round(float(npf), 4),
            lift=round(float(lift), 4),
        )

        if lift > 1.5 and pf > 0.1:
            winning.append(item)
        elif lift < 0.67 and npf > 0.1:
            losing.append(item)

    winning.sort(key=lambda x: x.lift, reverse=True)
    losing.sort(key=lambda x: x.lift)

    return PatternResponse(winning_phrases=winning[:20], losing_phrases=losing[:20])


@router.get("/compare", response_model=ComparisonResponse)
def compare_outcomes(db: Session = Depends(get_db)):
    """Side-by-side stats for purchase vs no_purchase calls."""
    calls = (
        db.query(Call, AnalysisResult)
        .join(AnalysisResult, Call.id == AnalysisResult.call_id)
        .filter(Call.outcome.in_(["purchase", "no_purchase"]))
        .filter(AnalysisResult.features.isnot(None))
        .all()
    )

    purchase_features = []
    no_purchase_features = []
    feature_names = get_feature_names()

    for call, analysis in calls:
        feats = [analysis.features.get(fn, 0) for fn in feature_names]
        if call.outcome == "purchase":
            purchase_features.append(feats)
        else:
            no_purchase_features.append(feats)

    if not purchase_features or not no_purchase_features:
        return ComparisonResponse(
            stats=[], total_purchase=len(purchase_features), total_no_purchase=len(no_purchase_features)
        )

    p_arr = np.array(purchase_features)
    np_arr = np.array(no_purchase_features)

    stats = []
    for i, fn in enumerate(feature_names):
        p_mean = float(np.mean(p_arr[:, i]))
        np_mean = float(np.mean(np_arr[:, i]))
        diff = p_mean - np_mean

        from scipy import stats as sp_stats
        try:
            _, p_val = sp_stats.ttest_ind(p_arr[:, i], np_arr[:, i])
            significant = p_val < 0.05
        except Exception:
            significant = False

        stats.append(ComparisonStats(
            metric=fn,
            purchase_mean=round(p_mean, 4),
            no_purchase_mean=round(np_mean, 4),
            difference=round(diff, 4),
            significant=significant,
        ))

    stats.sort(key=lambda x: abs(x.difference), reverse=True)

    return ComparisonResponse(
        stats=stats,
        total_purchase=len(purchase_features),
        total_no_purchase=len(no_purchase_features),
    )


@router.get("/insights", response_model=InsightsResponse)
def get_insights(db: Session = Depends(get_db)):
    """Aggregate GPT-derived insights across all analyzed calls."""
    analyses = (
        db.query(AnalysisResult, Call)
        .join(Call, Call.id == AnalysisResult.call_id)
        .all()
    )

    if not analyses:
        return InsightsResponse(
            total_calls=0, avg_quality_score=0, avg_sentiment=0,
            intent_breakdown={}, outcome_breakdown={},
            all_objections=[], all_tactics=[], agent_insights=[], quality_distribution={},
        )

    quality_scores = []
    sentiments = []
    intent_counts: dict[str, int] = {}
    outcome_counts: dict[str, int] = {}
    objection_counts: dict[str, int] = {}
    tactic_counts: dict[str, int] = {}
    quality_dist: dict[str, int] = {}

    agent_data: dict[str, dict] = {}

    for analysis, call in analyses:
        topics = analysis.topics or {}
        entities = analysis.entities or {}

        qs = topics.get("quality_score", 0)
        quality_scores.append(qs)
        sentiments.append(analysis.sentiment_score or 0)

        bucket = f"{(qs // 3) * 3 + 1}-{min((qs // 3) * 3 + 3, 10)}" if qs else "unrated"
        quality_dist[bucket] = quality_dist.get(bucket, 0) + 1

        intent = topics.get("customer_intent", "unknown")
        intent_counts[intent] = intent_counts.get(intent, 0) + 1

        outcome = topics.get("call_outcome", "unclear")
        outcome_counts[outcome] = outcome_counts.get(outcome, 0) + 1

        for obj in entities.get("objections_raised", []):
            objection_counts[obj] = objection_counts.get(obj, 0) + 1

        for tac in entities.get("agent_tactics", []):
            tactic_counts[tac] = tactic_counts.get(tac, 0) + 1

        # Per-agent data
        agent_id = call.agent_id
        if agent_id:
            if agent_id not in agent_data:
                agent = db.query(Agent).filter(Agent.id == agent_id).first()
                agent_data[agent_id] = {
                    "name": agent.name if agent else "Unknown",
                    "company": agent.team if agent else None,
                    "qualities": [],
                    "sentiments": [],
                    "outcomes": {},
                    "tactics": {},
                }
            ad = agent_data[agent_id]
            ad["qualities"].append(qs)
            ad["sentiments"].append(analysis.sentiment_score or 0)
            ad["outcomes"][call.outcome] = ad["outcomes"].get(call.outcome, 0) + 1
            for tac in entities.get("agent_tactics", []):
                ad["tactics"][tac] = ad["tactics"].get(tac, 0) + 1

    objections_sorted = sorted(objection_counts.items(), key=lambda x: x[1], reverse=True)
    tactics_sorted = sorted(tactic_counts.items(), key=lambda x: x[1], reverse=True)

    agent_insights = []
    for aid, ad in agent_data.items():
        top_tactics = sorted(ad["tactics"].items(), key=lambda x: x[1], reverse=True)
        agent_insights.append(AgentInsight(
            agent_name=ad["name"],
            company=ad["company"],
            total_calls=len(ad["qualities"]),
            avg_quality=round(sum(ad["qualities"]) / max(len(ad["qualities"]), 1), 1),
            avg_sentiment=round(sum(ad["sentiments"]) / max(len(ad["sentiments"]), 1), 2),
            outcomes=ad["outcomes"],
            top_tactics=[t[0] for t in top_tactics[:5]],
        ))
    agent_insights.sort(key=lambda x: x.avg_quality, reverse=True)

    return InsightsResponse(
        total_calls=len(analyses),
        avg_quality_score=round(sum(quality_scores) / max(len(quality_scores), 1), 1),
        avg_sentiment=round(sum(sentiments) / max(len(sentiments), 1), 2),
        intent_breakdown=intent_counts,
        outcome_breakdown=outcome_counts,
        all_objections=[{"objection": o, "count": c} for o, c in objections_sorted],
        all_tactics=[{"tactic": t, "count": c} for t, c in tactics_sorted],
        agent_insights=agent_insights,
        quality_distribution=quality_dist,
    )
