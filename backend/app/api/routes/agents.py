from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.agent import Agent
from app.models.call import Call
from app.models.analysis_result import AnalysisResult
from app.schemas.agent import AgentCreate, AgentUpdate, AgentResponse, AgentStats

router = APIRouter()


@router.get("/", response_model=list[AgentResponse])
def list_agents(db: Session = Depends(get_db)):
    return db.query(Agent).order_by(Agent.name).all()


@router.post("/", response_model=AgentResponse)
def create_agent(data: AgentCreate, db: Session = Depends(get_db)):
    agent = Agent(name=data.name, email=data.email, team=data.team)
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.get("/stats", response_model=list[AgentStats])
def get_agent_stats(db: Session = Depends(get_db)):
    agents = db.query(Agent).all()
    stats = []
    for agent in agents:
        total = db.query(Call).filter(Call.agent_id == agent.id).count()
        purchases = db.query(Call).filter(
            Call.agent_id == agent.id, Call.outcome == "purchase"
        ).count()
        avg_sent = db.query(func.avg(AnalysisResult.sentiment_score)).join(Call).filter(
            Call.agent_id == agent.id
        ).scalar()

        stats.append(AgentStats(
            id=agent.id,
            name=agent.name,
            total_calls=total,
            purchases=purchases,
            conversion_rate=round(purchases / max(total, 1), 4),
            avg_sentiment=round(float(avg_sent), 4) if avg_sent else None,
        ))
    return stats


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: str, data: AgentUpdate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(agent, key, value)
    db.commit()
    db.refresh(agent)
    return agent
