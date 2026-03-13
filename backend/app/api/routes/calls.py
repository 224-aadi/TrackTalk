import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import get_db
from app.models.call import Call
from app.models.transcript import Transcript
from app.models.analysis_result import AnalysisResult
from app.models.prediction import Prediction
from app.schemas.call import (
    CallResponse, CallUpdate, CallListResponse, CallWithDetails,
    TranscriptResponse, AnalysisResponse, PredictionResponse,
)
from app.tasks.transcription_tasks import transcribe_call

router = APIRouter()


@router.post("/upload", response_model=CallResponse)
async def upload_call(
    file: UploadFile = File(...),
    agent_id: str | None = Form(None),
    outcome: str = Form("pending"),
    call_date: str | None = Form(None),
    db: Session = Depends(get_db),
):
    allowed_extensions = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported audio format: {ext}")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")

    with open(filepath, "wb") as f:
        f.write(content)

    parsed_date = None
    if call_date:
        try:
            parsed_date = datetime.fromisoformat(call_date)
        except ValueError:
            pass

    call = Call(
        agent_id=agent_id if agent_id else None,
        audio_file_path=filepath,
        original_filename=file.filename or "unknown",
        outcome=outcome,
        call_date=parsed_date,
        status="uploaded",
    )
    db.add(call)
    db.commit()
    db.refresh(call)

    transcribe_call.delay(call.id)

    return call


@router.get("/", response_model=CallListResponse)
def list_calls(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    outcome: str | None = Query(None),
    status: str | None = Query(None),
    agent_id: str | None = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    query = db.query(Call)

    if outcome:
        query = query.filter(Call.outcome == outcome)
    if status:
        query = query.filter(Call.status == status)
    if agent_id:
        query = query.filter(Call.agent_id == agent_id)

    total = query.count()

    sort_col = getattr(Call, sort_by, Call.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(sort_col)

    calls = query.offset((page - 1) * page_size).limit(page_size).all()

    return CallListResponse(calls=calls, total=total, page=page, page_size=page_size)


@router.get("/{call_id}", response_model=CallWithDetails)
def get_call(call_id: str, db: Session = Depends(get_db)):
    call = (
        db.query(Call)
        .options(
            joinedload(Call.transcript),
            joinedload(Call.analysis_result),
            joinedload(Call.prediction),
        )
        .filter(Call.id == call_id)
        .first()
    )
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    result = CallWithDetails.model_validate(call)
    if call.transcript:
        result.transcript = TranscriptResponse.model_validate(call.transcript)
    if call.analysis_result:
        result.analysis = AnalysisResponse.model_validate(call.analysis_result)
    if call.prediction:
        result.prediction = PredictionResponse.model_validate(call.prediction)
    return result


@router.patch("/{call_id}", response_model=CallResponse)
def update_call(call_id: str, data: CallUpdate, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(call, key, value)
    db.commit()
    db.refresh(call)
    return call


@router.delete("/{call_id}")
def delete_call(call_id: str, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    if call.audio_file_path and os.path.exists(call.audio_file_path):
        os.remove(call.audio_file_path)

    db.delete(call)
    db.commit()
    return {"detail": "Call deleted"}


@router.post("/{call_id}/retranscribe")
def retranscribe_call(call_id: str, db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    existing = db.query(Transcript).filter(Transcript.call_id == call_id).first()
    if existing:
        db.delete(existing)
    existing_analysis = db.query(AnalysisResult).filter(AnalysisResult.call_id == call_id).first()
    if existing_analysis:
        db.delete(existing_analysis)

    call.status = "uploaded"
    db.commit()

    transcribe_call.delay(call_id)
    return {"detail": "Re-transcription queued"}
