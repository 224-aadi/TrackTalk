from pathlib import Path

from openai import OpenAI

from app.core.config import settings


class TranscriptionService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def transcribe(self, audio_path: str) -> dict:
        """Translate audio to English text using OpenAI Whisper API.

        Uses the translations endpoint so any source language is
        automatically translated to English in the output.
        """
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        with open(audio_path, "rb") as audio_file:
            response = self.client.audio.translations.create(
                model=settings.WHISPER_MODEL,
                file=audio_file,
                response_format="verbose_json",
            )

        segments = []
        if hasattr(response, "segments") and response.segments:
            for seg in response.segments:
                segments.append({
                    "id": seg.get("id", 0) if isinstance(seg, dict) else getattr(seg, "id", 0),
                    "start": seg.get("start", 0) if isinstance(seg, dict) else getattr(seg, "start", 0),
                    "end": seg.get("end", 0) if isinstance(seg, dict) else getattr(seg, "end", 0),
                    "text": (seg.get("text", "") if isinstance(seg, dict) else getattr(seg, "text", "")).strip(),
                })

        return {
            "text": response.text,
            "segments": {"segments": segments, "words": []},
            "language": getattr(response, "language", "en"),
            "duration": getattr(response, "duration", None),
        }


transcription_service = TranscriptionService()
