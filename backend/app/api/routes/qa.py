"""Phase 5 - QA & Compliance routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.call import Call
from app.models.agent import Agent
from app.models.transcript import Transcript
from app.models.qa_score import QAScore, ComplianceRule
from app.services.qa import score_call, get_default_rules

router = APIRouter()


@router.get("/rules")
def list_rules(db: Session = Depends(get_db)):
    """List all compliance rules (custom + defaults)."""
    custom = db.query(ComplianceRule).filter(ComplianceRule.is_active == True).all()
    if custom:
        return [
            {
                "id": r.id, "name": r.name, "description": r.description,
                "rule_type": r.rule_type, "points": r.points,
                "is_mandatory": r.is_mandatory, "is_custom": True,
            }
            for r in custom
        ]
    return [
        {**r, "id": None, "rule_type": "default", "is_custom": False}
        for r in get_default_rules()
    ]


@router.post("/rules")
def create_rule(data: dict, db: Session = Depends(get_db)):
    """Create a custom compliance rule."""
    rule = ComplianceRule(
        name=data["name"],
        description=data.get("description", ""),
        rule_type=data.get("rule_type", "custom"),
        pattern=data.get("pattern"),
        points=data.get("points", 5),
        is_mandatory=data.get("is_mandatory", False),
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"id": rule.id, "name": rule.name, "created": True}


@router.post("/score/{call_id}")
def score_single_call(call_id: str, db: Session = Depends(get_db)):
    """Run QA scoring on a specific call."""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    transcript = db.query(Transcript).filter(Transcript.call_id == call_id).first()
    if not transcript:
        raise HTTPException(status_code=400, detail="Call has no transcript")

    custom_rules = db.query(ComplianceRule).filter(ComplianceRule.is_active == True).all()
    rules = None
    if custom_rules:
        rules = [
            {"name": r.name, "description": r.description, "points": r.points, "is_mandatory": r.is_mandatory}
            for r in custom_rules
        ]

    result = score_call(transcript.full_text, custom_rules=rules)

    existing = db.query(QAScore).filter(QAScore.call_id == call_id).first()
    if existing:
        existing.total_score = result.get("total_score", 0)
        existing.breakdown = result
        existing.flags = {"flags": result.get("flags", [])}
    else:
        qa = QAScore(
            call_id=call_id,
            total_score=result.get("total_score", 0),
            breakdown=result,
            flags={"flags": result.get("flags", [])},
        )
        db.add(qa)

    db.commit()

    return {"call_id": call_id, "score": result}


@router.get("/scores")
def list_scores(db: Session = Depends(get_db)):
    """List all QA scores."""
    scores = (
        db.query(QAScore, Call)
        .join(Call, Call.id == QAScore.call_id)
        .order_by(QAScore.created_at.desc())
        .all()
    )

    results = []
    for qa, call in scores:
        agent_name = "Unknown"
        if call.agent_id:
            agent = db.query(Agent).filter(Agent.id == call.agent_id).first()
            if agent:
                agent_name = agent.name

        breakdown = qa.breakdown or {}
        flags = qa.flags.get("flags", []) if qa.flags else []

        results.append({
            "id": qa.id,
            "call_id": qa.call_id,
            "original_filename": call.original_filename,
            "agent_name": agent_name,
            "total_score": qa.total_score,
            "flags_count": len(flags),
            "critical_flags": len([f for f in flags if f.get("severity") == "critical"]),
            "mandatory_passed": breakdown.get("mandatory_check", {}).get("all_mandatory_passed", False),
            "created_at": qa.created_at.isoformat(),
        })

    return results


@router.get("/scores/{call_id}")
def get_score(call_id: str, db: Session = Depends(get_db)):
    """Get QA score for a specific call."""
    qa = db.query(QAScore).filter(QAScore.call_id == call_id).first()
    if not qa:
        raise HTTPException(status_code=404, detail="No QA score for this call")

    return {
        "id": qa.id,
        "call_id": qa.call_id,
        "total_score": qa.total_score,
        "breakdown": qa.breakdown,
        "flags": qa.flags,
        "reviewer_notes": qa.reviewer_notes,
        "created_at": qa.created_at.isoformat(),
    }


@router.post("/score-all")
def score_all_calls(db: Session = Depends(get_db)):
    """Score all analyzed calls that don't have QA scores yet."""
    calls = (
        db.query(Call)
        .filter(Call.status == "analyzed")
        .outerjoin(QAScore, QAScore.call_id == Call.id)
        .filter(QAScore.id.is_(None))
        .all()
    )

    custom_rules = db.query(ComplianceRule).filter(ComplianceRule.is_active == True).all()
    rules = None
    if custom_rules:
        rules = [
            {"name": r.name, "description": r.description, "points": r.points, "is_mandatory": r.is_mandatory}
            for r in custom_rules
        ]

    scored = 0
    errors = 0
    for call in calls:
        try:
            transcript = db.query(Transcript).filter(Transcript.call_id == call.id).first()
            if not transcript:
                continue

            result = score_call(transcript.full_text, custom_rules=rules)

            qa = QAScore(
                call_id=call.id,
                total_score=result.get("total_score", 0),
                breakdown=result,
                flags={"flags": result.get("flags", [])},
            )
            db.add(qa)
            db.commit()
            scored += 1
        except Exception:
            errors += 1
            db.rollback()

    return {"scored": scored, "errors": errors}
