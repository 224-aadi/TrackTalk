from app.tasks.worker import celery_app
from app.core.database import SessionLocal
from app.models.call import Call
from app.models.transcript import Transcript
from app.services.transcription import transcription_service


@celery_app.task(bind=True, max_retries=3)
def transcribe_call(self, call_id: str):
    """Transcribe audio for a call and store the transcript."""
    db = SessionLocal()
    try:
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            return {"error": f"Call {call_id} not found"}

        call.status = "transcribing"
        db.commit()

        result = transcription_service.transcribe(call.audio_file_path)

        text = result["text"]
        transcript = Transcript(
            call_id=call_id,
            full_text=text,
            segments=result["segments"],
            language=result["language"],
            confidence=None,
            word_count=len(text.split()),
        )
        db.add(transcript)

        if result.get("duration"):
            call.duration_seconds = result["duration"]

        call.status = "transcribed"
        db.commit()

        from app.tasks.analysis_tasks import analyze_call
        analyze_call.delay(call_id)

        return {"call_id": call_id, "status": "transcribed", "word_count": transcript.word_count}

    except Exception as exc:
        db.rollback()
        call = db.query(Call).filter(Call.id == call_id).first()
        if call:
            call.status = "transcription_failed"
            db.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
