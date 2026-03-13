from app.tasks.worker import celery_app
from app.core.database import SessionLocal
from app.models.agent import Agent
from app.models.call import Call
from app.models.transcript import Transcript
from app.models.analysis_result import AnalysisResult
from app.services.text_analysis import analyze_transcript
from app.services.feature_engineering import extract_features

OUTCOME_MAP = {
    "sale_made": "purchase",
    "follow_up_needed": "no_purchase",
    "customer_declined": "no_purchase",
    "information_provided": "no_purchase",
    "unresolved": "no_purchase",
    "unclear": "pending",
}


def _get_or_create_agent(db, agent_name: str, company_name: str) -> str | None:
    """Find existing agent by name or create a new one. Returns agent ID."""
    if not agent_name or agent_name == "Unknown":
        return None

    name_normalized = agent_name.strip().title()
    agent = db.query(Agent).filter(Agent.name == name_normalized).first()
    if agent:
        return agent.id

    agent = Agent(name=name_normalized, team="TrakNTell")
    db.add(agent)
    db.flush()
    return agent.id


@celery_app.task(bind=True, max_retries=3)
def analyze_call(self, call_id: str):
    """Run GPT-powered analysis on a transcribed call."""
    db = SessionLocal()
    try:
        call = db.query(Call).filter(Call.id == call_id).first()
        transcript = db.query(Transcript).filter(Transcript.call_id == call_id).first()

        if not call or not transcript:
            return {"error": f"Call or transcript not found for {call_id}"}

        call.status = "analyzing"
        db.commit()

        gpt_analysis = analyze_transcript(transcript.full_text)

        # Auto-assign agent
        if not call.agent_id:
            agent_id = _get_or_create_agent(
                db, gpt_analysis.get("agent_name", ""), gpt_analysis.get("company_name", "")
            )
            if agent_id:
                call.agent_id = agent_id

        # Auto-label outcome from GPT analysis
        gpt_outcome = gpt_analysis.get("call_outcome", "unclear")
        if call.outcome == "pending":
            call.outcome = OUTCOME_MAP.get(gpt_outcome, "pending")

        keywords = [
            {"keyword": kw.get("keyword", kw) if isinstance(kw, dict) else str(kw),
             "score": 1.0 if (isinstance(kw, dict) and kw.get("relevance") == "high")
             else 0.6 if (isinstance(kw, dict) and kw.get("relevance") == "medium")
             else 0.3}
            for kw in gpt_analysis.get("keywords", [])
        ]

        features = extract_features(
            transcript_text=transcript.full_text,
            segments=transcript.segments,
            duration_seconds=call.duration_seconds,
            sentiment_score=gpt_analysis["sentiment_score"],
            keywords=keywords,
            call_date=call.call_date,
        )

        existing = db.query(AnalysisResult).filter(AnalysisResult.call_id == call_id).first()
        analysis_data = dict(
            sentiment_score=gpt_analysis["sentiment_score"],
            sentiment_label=gpt_analysis["sentiment_label"],
            keywords={"keywords": keywords},
            topics={
                "summary": gpt_analysis["summary"],
                "customer_intent": gpt_analysis["customer_intent"],
                "call_outcome": gpt_outcome,
                "quality_score": gpt_analysis["quality_score"],
                "agent_name": gpt_analysis.get("agent_name", "Unknown"),
                "company_name": gpt_analysis.get("company_name", "Unknown"),
            },
            entities={
                "objections_raised": gpt_analysis["objections_raised"],
                "agent_tactics": gpt_analysis["agent_tactics"],
            },
            features=features,
        )

        if existing:
            for k, v in analysis_data.items():
                setattr(existing, k, v)
        else:
            analysis = AnalysisResult(call_id=call_id, **analysis_data)
            db.add(analysis)

        call.status = "analyzed"
        db.commit()

        return {
            "call_id": call_id,
            "status": "analyzed",
            "agent_name": gpt_analysis.get("agent_name"),
            "outcome": call.outcome,
            "sentiment": {"score": gpt_analysis["sentiment_score"], "label": gpt_analysis["sentiment_label"]},
            "summary": gpt_analysis["summary"],
        }

    except Exception as exc:
        db.rollback()
        call = db.query(Call).filter(Call.id == call_id).first()
        if call:
            call.status = "analysis_failed"
            db.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
