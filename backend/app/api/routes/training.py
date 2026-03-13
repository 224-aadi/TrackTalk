"""Phase 6 - Agent Training & Onboarding routes."""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from openai import OpenAI

from app.core.config import settings
from app.core.database import get_db
from app.models.call import Call
from app.models.agent import Agent
from app.models.transcript import Transcript
from app.models.analysis_result import AnalysisResult
from app.models.coaching_session import CoachingSession
from app.models.training_module import TrainingModule, BestCallAnnotation

router = APIRouter()


def _gpt_call(prompt: str) -> dict:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a training specialist. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=2000,
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()
    return json.loads(raw)


@router.get("/best-calls")
def list_best_calls(db: Session = Depends(get_db)):
    """List all calls marked as best examples."""
    annotations = (
        db.query(BestCallAnnotation, Call)
        .join(Call, Call.id == BestCallAnnotation.call_id)
        .order_by(BestCallAnnotation.created_at.desc())
        .all()
    )

    results = []
    for ann, call in annotations:
        agent_name = "Unknown"
        if call.agent_id:
            agent = db.query(Agent).filter(Agent.id == call.agent_id).first()
            if agent:
                agent_name = agent.name

        analysis = db.query(AnalysisResult).filter(AnalysisResult.call_id == call.id).first()
        results.append({
            "id": ann.id,
            "call_id": ann.call_id,
            "original_filename": call.original_filename,
            "agent_name": agent_name,
            "label": ann.label,
            "description": ann.description,
            "timestamp_start": ann.timestamp_start,
            "timestamp_end": ann.timestamp_end,
            "quality_score": (analysis.topics or {}).get("quality_score") if analysis else None,
            "created_at": ann.created_at.isoformat(),
        })

    return results


@router.post("/best-calls/{call_id}")
def mark_best_call(call_id: str, data: dict, db: Session = Depends(get_db)):
    """Mark a call (or moment) as a best example for training."""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    annotation = BestCallAnnotation(
        call_id=call_id,
        label=data.get("label", "Best Practice Example"),
        description=data.get("description", ""),
        timestamp_start=data.get("timestamp_start"),
        timestamp_end=data.get("timestamp_end"),
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)

    return {"id": annotation.id, "call_id": call_id, "label": annotation.label}


@router.delete("/best-calls/{annotation_id}")
def remove_best_call(annotation_id: str, db: Session = Depends(get_db)):
    """Remove a best call annotation."""
    ann = db.query(BestCallAnnotation).filter(BestCallAnnotation.id == annotation_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Annotation not found")
    db.delete(ann)
    db.commit()
    return {"detail": "Removed"}


@router.get("/recommendations/{agent_id}")
def get_agent_recommendations(agent_id: str, db: Session = Depends(get_db)):
    """Get or generate training recommendations for a specific agent."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    existing = db.query(TrainingModule).filter(
        TrainingModule.title == f"recommendations:{agent_id}"
    ).first()

    if existing:
        return {
            "agent_id": agent_id,
            "agent_name": agent.name,
            "recommendations": existing.content,
            "generated_at": existing.created_at.isoformat(),
        }

    raise HTTPException(status_code=404, detail="No recommendations yet. Generate them first.")


@router.post("/recommendations/{agent_id}")
def generate_recommendations(agent_id: str, db: Session = Depends(get_db)):
    """Generate personalized training recommendations for an agent using GPT."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    calls = db.query(Call).filter(Call.agent_id == agent_id).all()
    if not calls:
        raise HTTPException(status_code=400, detail="Agent has no calls to analyze")

    call_summaries = []
    for call in calls:
        analysis = db.query(AnalysisResult).filter(AnalysisResult.call_id == call.id).first()
        coaching = db.query(CoachingSession).filter(CoachingSession.call_id == call.id).first()
        if analysis:
            topics = analysis.topics or {}
            entities = analysis.entities or {}
            summary = {
                "filename": call.original_filename,
                "outcome": call.outcome,
                "sentiment": analysis.sentiment_score,
                "quality": topics.get("quality_score", 0),
                "summary": topics.get("summary", ""),
                "objections": entities.get("objections_raised", []),
                "tactics": entities.get("agent_tactics", []),
            }
            if coaching and coaching.suggestions:
                summary["coaching_tags"] = coaching.suggestions.get("training_tags", [])
                summary["improvements"] = [
                    imp.get("issue", "") for imp in coaching.suggestions.get("improvements", [])
                ]
            call_summaries.append(summary)

    prompt = f"""Based on these call performance summaries for agent "{agent.name}", generate personalized training recommendations.

Agent calls:
{json.dumps(call_summaries, indent=2)}

Return a JSON object with:
1. "skill_gaps": List of 3-5 specific skill gaps identified (each as dict with "skill", "evidence", "priority" high/medium/low).
2. "training_plan": List of 3-5 ordered training steps (each as dict with "step", "title", "description", "duration_estimate" like "30 mins").
3. "practice_scenarios": List of 2-3 role-play scenarios tailored to this agent's weaknesses (each as dict with "scenario", "customer_type", "objective").
4. "strengths_to_leverage": List of 2-3 things this agent does well that should be reinforced.
5. "overall_assessment": A 2-3 sentence overall assessment of this agent.

Return ONLY valid JSON."""

    try:
        result = _gpt_call(prompt)
    except Exception:
        result = {
            "skill_gaps": [],
            "training_plan": [],
            "practice_scenarios": [],
            "strengths_to_leverage": [],
            "overall_assessment": "Could not generate recommendations.",
        }

    existing = db.query(TrainingModule).filter(
        TrainingModule.title == f"recommendations:{agent_id}"
    ).first()
    if existing:
        existing.content = result
    else:
        module = TrainingModule(
            title=f"recommendations:{agent_id}",
            description=f"Training recommendations for {agent.name}",
            content=result,
            is_published=True,
        )
        db.add(module)

    db.commit()

    return {
        "agent_id": agent_id,
        "agent_name": agent.name,
        "recommendations": result,
    }


@router.get("/agents")
def list_agents_with_training_status(db: Session = Depends(get_db)):
    """List all agents with their training recommendation status."""
    agents = db.query(Agent).all()
    results = []
    for agent in agents:
        call_count = db.query(Call).filter(Call.agent_id == agent.id).count()
        if call_count == 0:
            continue

        has_recs = db.query(TrainingModule).filter(
            TrainingModule.title == f"recommendations:{agent.id}"
        ).first() is not None

        coaching_count = (
            db.query(CoachingSession)
            .join(Call, Call.id == CoachingSession.call_id)
            .filter(Call.agent_id == agent.id)
            .count()
        )

        results.append({
            "id": agent.id,
            "name": agent.name,
            "team": agent.team,
            "call_count": call_count,
            "has_recommendations": has_recs,
            "coaching_sessions": coaching_count,
        })

    return results
