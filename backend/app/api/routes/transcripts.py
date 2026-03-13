from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.transcript import Transcript
from app.schemas.call import TranscriptResponse

router = APIRouter()


@router.get("/", response_model=list[TranscriptResponse])
def list_transcripts(
    search: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Transcript)
    if search:
        query = query.filter(Transcript.full_text.ilike(f"%{search}%"))
    return query.order_by(Transcript.created_at.desc()).limit(limit).all()


@router.get("/{call_id}", response_model=TranscriptResponse)
def get_transcript(call_id: str, db: Session = Depends(get_db)):
    transcript = db.query(Transcript).filter(Transcript.call_id == call_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return transcript
