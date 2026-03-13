"""Phase 4 - Call Coaching routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.call import Call
from app.models.agent import Agent
from app.models.transcript import Transcript
from app.models.analysis_result import AnalysisResult
from app.models.coaching_session import CoachingSession
from app.services.coaching import generate_coaching

router = APIRouter()


@router.post("/generate/{call_id}")
def generate_coaching_report(call_id: str, db: Session = Depends(get_db)):
    """Generate a GPT-powered coaching report for a specific call."""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    transcript = db.query(Transcript).filter(Transcript.call_id == call_id).first()
    if not transcript:
        raise HTTPException(status_code=400, detail="Call has no transcript")

    analysis = db.query(AnalysisResult).filter(AnalysisResult.call_id == call_id).first()

    agent_name = "Unknown"
    if call.agent_id:
        agent = db.query(Agent).filter(Agent.id == call.agent_id).first()
        if agent:
            agent_name = agent.name

    topics = analysis.topics if analysis else {}
    coaching_data = generate_coaching(
        transcript_text=transcript.full_text,
        agent_name=agent_name,
        duration=call.duration_seconds or 0,
        sentiment=analysis.sentiment_score if analysis else 0,
        sentiment_label=analysis.sentiment_label if analysis else "NEUTRAL",
        outcome=call.outcome,
    )

    existing = db.query(CoachingSession).filter(CoachingSession.call_id == call_id).first()
    if existing:
        existing.suggestions = coaching_data
        existing.agent_id = call.agent_id or existing.agent_id
    else:
        session = CoachingSession(
            call_id=call_id,
            agent_id=call.agent_id or "unknown",
            suggestions=coaching_data,
        )
        db.add(session)

    db.commit()

    return {"call_id": call_id, "agent_name": agent_name, "coaching": coaching_data}


@router.get("/")
def list_coaching_sessions(db: Session = Depends(get_db)):
    """List all coaching sessions."""
    sessions = (
        db.query(CoachingSession, Call, Agent)
        .join(Call, Call.id == CoachingSession.call_id)
        .outerjoin(Agent, Agent.id == CoachingSession.agent_id)
        .order_by(CoachingSession.created_at.desc())
        .all()
    )

    return [
        {
            "id": s.id,
            "call_id": s.call_id,
            "agent_name": a.name if a else "Unknown",
            "original_filename": c.original_filename,
            "overall_rating": (s.suggestions or {}).get("overall_rating", 0),
            "training_tags": (s.suggestions or {}).get("training_tags", []),
            "created_at": s.created_at.isoformat(),
        }
        for s, c, a in sessions
    ]


@router.get("/{call_id}")
def get_coaching_session(call_id: str, db: Session = Depends(get_db)):
    """Get coaching report for a specific call."""
    session = db.query(CoachingSession).filter(CoachingSession.call_id == call_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="No coaching session for this call")

    agent_name = "Unknown"
    if session.agent_id:
        agent = db.query(Agent).filter(Agent.id == session.agent_id).first()
        if agent:
            agent_name = agent.name

    return {
        "id": session.id,
        "call_id": session.call_id,
        "agent_name": agent_name,
        "coaching": session.suggestions,
        "created_at": session.created_at.isoformat(),
    }


@router.post("/generate-all")
def generate_all_coaching(db: Session = Depends(get_db)):
    """Generate coaching for all analyzed calls that don't have coaching yet."""
    calls = (
        db.query(Call)
        .filter(Call.status == "analyzed")
        .outerjoin(CoachingSession, CoachingSession.call_id == Call.id)
        .filter(CoachingSession.id.is_(None))
        .all()
    )

    generated = 0
    errors = 0
    for call in calls:
        try:
            transcript = db.query(Transcript).filter(Transcript.call_id == call.id).first()
            analysis = db.query(AnalysisResult).filter(AnalysisResult.call_id == call.id).first()
            if not transcript:
                continue

            agent_name = "Unknown"
            if call.agent_id:
                agent = db.query(Agent).filter(Agent.id == call.agent_id).first()
                if agent:
                    agent_name = agent.name

            coaching_data = generate_coaching(
                transcript_text=transcript.full_text,
                agent_name=agent_name,
                duration=call.duration_seconds or 0,
                sentiment=analysis.sentiment_score if analysis else 0,
                sentiment_label=analysis.sentiment_label if analysis else "NEUTRAL",
                outcome=call.outcome,
            )

            session = CoachingSession(
                call_id=call.id,
                agent_id=call.agent_id or "unknown",
                suggestions=coaching_data,
            )
            db.add(session)
            db.commit()
            generated += 1
        except Exception:
            errors += 1
            db.rollback()

    return {"generated": generated, "errors": errors}
