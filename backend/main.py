"""
Entry point for Railpack / Railway. Re-exports the FastAPI app so
`uvicorn main:app` works when the project root is backend/.
"""
from app.main import app

__all__ = ["app"]
