from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import settings
from app.api.routes import calls, transcripts, analysis, predictions, agents
from app.api.routes import coaching, qa, training, insights

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Call Center Analytics Platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

app.include_router(calls.router, prefix="/api/calls", tags=["calls"])
app.include_router(transcripts.router, prefix="/api/transcripts", tags=["transcripts"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(coaching.router, prefix="/api/coaching", tags=["coaching"])
app.include_router(qa.router, prefix="/api/qa", tags=["qa"])
app.include_router(training.router, prefix="/api/training", tags=["training"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}
