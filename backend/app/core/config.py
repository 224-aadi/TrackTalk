from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "TrackTalk"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql://tracktalk:tracktalk_dev@localhost:5432/tracktalk"
    ASYNC_DATABASE_URL: str = "postgresql+psycopg2://tracktalk:tracktalk_dev@localhost:5432/tracktalk"

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    OPENAI_API_KEY: str = ""

    UPLOAD_DIR: str = str(Path(__file__).resolve().parent.parent.parent.parent / "data" / "uploads")
    MODEL_DIR: str = str(Path(__file__).resolve().parent.parent.parent.parent / "data" / "models")

    MAX_UPLOAD_SIZE_MB: int = 100

    WHISPER_MODEL: str = "whisper-1"

    SENTIMENT_MODEL: str = "distilbert-base-uncased-finetuned-sst-2-english"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
