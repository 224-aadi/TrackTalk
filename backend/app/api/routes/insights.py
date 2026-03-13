"""Phase 7 - Strategic Insights & Optimization routes."""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from openai import OpenAI

from app.core.config import settings
from app.core.database import get_db
from app.models.call import Call
from app.models.agent import Agent
from app.models.transcript import Transcript
from app.models.analysis_result import AnalysisResult
from app.models.qa_score import QAScore
from app.models.report import Report

router = APIRouter()


def _gpt_call(prompt: str, max_tokens: int = 2500) -> dict:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a strategic business analyst for a call center. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=max_tokens,
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()
    return json.loads(raw)


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    """Get a comprehensive summary of all call center data."""
    total_calls = db.query(Call).count()
    analyzed = db.query(Call).filter(Call.status == "analyzed").count()
    avg_sentiment = db.query(func.avg(AnalysisResult.sentiment_score)).scalar()

    outcomes = {}
    for outcome, count in db.query(Call.outcome, func.count()).group_by(Call.outcome).all():
        outcomes[outcome or "unknown"] = count

    agents = db.query(Agent).all()
    agent_stats = []
    for agent in agents:
        count = db.query(Call).filter(Call.agent_id == agent.id).count()
        if count == 0:
            continue
        avg_s = db.query(func.avg(AnalysisResult.sentiment_score)).join(Call).filter(
            Call.agent_id == agent.id
        ).scalar()
        agent_stats.append({
            "name": agent.name,
            "team": agent.team,
            "calls": count,
            "avg_sentiment": round(float(avg_s), 2) if avg_s else 0,
        })

    all_objections = []
    all_tactics = []
    all_intents = []
    quality_scores = []

    analyses = db.query(AnalysisResult).all()
    for a in analyses:
        topics = a.topics or {}
        entities = a.entities or {}
        quality_scores.append(topics.get("quality_score", 0))
        all_intents.append(topics.get("customer_intent", "unknown"))
        all_objections.extend(entities.get("objections_raised", []))
        all_tactics.extend(entities.get("agent_tactics", []))

    avg_qa = db.query(func.avg(QAScore.total_score)).scalar()

    return {
        "total_calls": total_calls,
        "analyzed_calls": analyzed,
        "avg_sentiment": round(float(avg_sentiment), 2) if avg_sentiment else 0,
        "avg_quality": round(sum(quality_scores) / max(len(quality_scores), 1), 1),
        "avg_qa_score": round(float(avg_qa), 1) if avg_qa else None,
        "outcomes": outcomes,
        "agent_stats": agent_stats,
        "top_objections": _top_n(all_objections, 10),
        "top_tactics": _top_n(all_tactics, 10),
        "intent_breakdown": _top_n(all_intents, 10),
    }


@router.post("/generate-report")
def generate_report(db: Session = Depends(get_db)):
    """Generate a GPT-powered strategic insights report."""
    total_calls = db.query(Call).count()
    if total_calls == 0:
        raise HTTPException(status_code=400, detail="No calls to analyze")

    analyses = db.query(AnalysisResult).all()
    call_data = []
    for a in analyses:
        call = db.query(Call).filter(Call.id == a.call_id).first()
        topics = a.topics or {}
        entities = a.entities or {}
        call_data.append({
            "filename": call.original_filename if call else "unknown",
            "outcome": call.outcome if call else "unknown",
            "sentiment": a.sentiment_score,
            "quality": topics.get("quality_score", 0),
            "summary": topics.get("summary", ""),
            "intent": topics.get("customer_intent", "unknown"),
            "objections": entities.get("objections_raised", []),
            "tactics": entities.get("agent_tactics", []),
        })

    agents = db.query(Agent).all()
    agent_info = []
    for agent in agents:
        count = db.query(Call).filter(Call.agent_id == agent.id).count()
        if count == 0:
            continue
        agent_info.append({"name": agent.name, "team": agent.team, "calls": count})

    prompt = f"""Analyze this call center data and produce strategic insights and recommendations.

Call data ({len(call_data)} calls):
{json.dumps(call_data, indent=2)}

Agents: {json.dumps(agent_info)}

Return a JSON object with:

1. "executive_summary": A 3-5 sentence executive summary of the call center's performance.

2. "key_findings": List of 4-6 key findings (each as dict with "finding", "impact" high/medium/low, "evidence").

3. "recommendations": List of 4-6 actionable recommendations (each as dict with "recommendation", "priority" high/medium/low, "expected_impact", "implementation").

4. "risk_areas": List of 2-3 risk areas that need attention (each as dict with "risk", "severity" high/medium/low, "mitigation").

5. "opportunities": List of 2-3 growth opportunities identified (each as dict with "opportunity", "potential", "action_needed").

6. "metrics_targets": Suggested target metrics for improvement (dict with "target_conversion_rate", "target_avg_quality", "target_avg_sentiment", "target_qa_score").

Return ONLY valid JSON."""

    try:
        result = _gpt_call(prompt)
    except Exception as e:
        result = {
            "executive_summary": f"Report generation failed: {str(e)}",
            "key_findings": [],
            "recommendations": [],
            "risk_areas": [],
            "opportunities": [],
            "metrics_targets": {},
        }

    report = Report(
        title=f"Strategic Report - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        report_type="strategic",
        period_start=db.query(func.min(Call.created_at)).scalar(),
        period_end=db.query(func.max(Call.created_at)).scalar(),
        data=result,
        summary=result.get("executive_summary", ""),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "title": report.title,
        "report": result,
        "created_at": report.created_at.isoformat(),
    }


@router.get("/reports")
def list_reports(db: Session = Depends(get_db)):
    """List all generated reports."""
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "report_type": r.report_type,
            "summary": r.summary,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]


@router.get("/reports/{report_id}")
def get_report(report_id: str, db: Session = Depends(get_db)):
    """Get a specific report."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "id": report.id,
        "title": report.title,
        "report_type": report.report_type,
        "data": report.data,
        "summary": report.summary,
        "period_start": report.period_start.isoformat() if report.period_start else None,
        "period_end": report.period_end.isoformat() if report.period_end else None,
        "created_at": report.created_at.isoformat(),
    }


def _top_n(items: list, n: int) -> list[dict]:
    from collections import Counter
    counts = Counter(items)
    return [{"item": item, "count": count} for item, count in counts.most_common(n)]
