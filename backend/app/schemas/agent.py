from datetime import datetime
from pydantic import BaseModel


class AgentCreate(BaseModel):
    name: str
    email: str | None = None
    team: str | None = None


class AgentUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    team: str | None = None


class AgentResponse(BaseModel):
    id: str
    name: str
    email: str | None
    team: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentStats(BaseModel):
    id: str
    name: str
    total_calls: int
    purchases: int
    conversion_rate: float
    avg_sentiment: float | None
