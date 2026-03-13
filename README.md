# TrackTalk

AI-powered call center analytics platform that transforms raw audio recordings into actionable insights, predictive models, and real-time coaching.

## Architecture

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│       Next.js Frontend       │     │     External APIs             │
│  (React, Tailwind, Recharts) │     │  - OpenAI Whisper (STT)      │
│                              │     │  - OpenAI GPT-4 (coaching)   │
└──────────────┬───────────────┘     └──────────────┬───────────────┘
               │ HTTP                                │
               ▼                                     │
┌──────────────────────────────┐                     │
│       FastAPI Backend        │◄────────────────────┘
│  - REST API                  │
│  - NLP Services              │
│  - ML Pipeline               │
│  - Celery Task Queue         │
└──────┬───────────┬───────────┘
       │           │
       ▼           ▼
┌────────────┐ ┌────────────┐
│ PostgreSQL │ │   Redis    │
│  (data)    │ │  (queue)   │
└────────────┘ └────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy, Alembic, Celery |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts |
| Database | PostgreSQL 16 |
| Queue | Redis 7, Celery |
| ML/NLP | OpenAI Whisper, HuggingFace Transformers, scikit-learn, XGBoost, SHAP |
| Infrastructure | Docker Compose |

## Features

### Phase 1 - Transcription & Text Analysis (Implemented)
- Audio file upload with batch processing
- OpenAI Whisper transcription with word-level timestamps
- Sentiment analysis (HuggingFace DistilBERT)
- Keyword extraction (TF-IDF)
- Dashboard with metrics, sentiment trends, and keyword cloud

### Phase 2 - Pattern Correlation (Implemented)
- 30+ engineered features per call
- Feature-outcome correlation analysis
- Winning/losing phrase detection
- Side-by-side outcome comparison with statistical significance testing

### Phase 3 - Predictive Model (Implemented)
- XGBoost model training with cross-validation
- Model versioning and activation
- Per-call prediction with SHAP explanations
- Batch prediction for all analyzed calls
- ROC curves, confusion matrix, feature importance visualization

### Phases 4-7 (Scaffolded)
- **Phase 4**: Real-time call coaching (WebSocket + GPT-4)
- **Phase 5**: QA & compliance scoring
- **Phase 6**: Agent training portal with best-calls library
- **Phase 7**: Strategic insights and optimization reports

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8000

# In a separate terminal, start the Celery worker
celery -A app.tasks.worker worker --loglevel=info
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at **http://localhost:3000**.

### 4. Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://tracktalk:tracktalk_dev@localhost:5432/tracktalk
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
OPENAI_API_KEY=sk-your-key-here
```

## Usage Guide

### Uploading Calls
1. Navigate to **Call Explorer**
2. Click **Upload Calls** and select audio files (.wav, .mp3, .m4a, .ogg, .flac)
3. Calls are automatically transcribed and analyzed in the background
4. View status updates in real-time on the call detail page

### Labeling Outcomes
1. Open a call detail page
2. Use the dropdown to set the outcome: **Purchase**, **No Purchase**, or **Pending**
3. Labeled data is required for correlation analysis and model training

### Training a Prediction Model
1. Label at least 10 calls (mix of purchase and no_purchase)
2. Navigate to **Predictions**
3. Click **Train New Model**
4. View metrics: accuracy, F1, AUC, confusion matrix, ROC curve
5. Use **Batch Predict** to score all unscored calls

### Analyzing Patterns
1. Navigate to **Analysis**
2. View feature-outcome correlations
3. Explore winning and losing phrases
4. Compare purchase vs no-purchase call statistics

## API Reference

The backend serves a full REST API at `http://localhost:8000`. View the interactive docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calls/upload` | Upload audio file |
| GET | `/api/calls/` | List calls with filters |
| GET | `/api/calls/{id}` | Get call with transcript, analysis, prediction |
| GET | `/api/analysis/dashboard` | Dashboard metrics |
| GET | `/api/analysis/correlations` | Feature-outcome correlations |
| GET | `/api/analysis/patterns` | Winning/losing phrases |
| GET | `/api/analysis/compare` | Outcome comparison stats |
| POST | `/api/predictions/train` | Train new model |
| POST | `/api/predictions/predict/{id}` | Predict single call |
| POST | `/api/predictions/predict-batch` | Predict all unscored calls |
| GET | `/api/predictions/models` | List model versions |
| GET | `/api/agents/stats` | Agent performance stats |

## Project Structure

```
tracktalk/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route handlers
│   │   ├── core/             # Config, database, security
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic (transcription, NLP, ML)
│   │   ├── ml/               # ML training and evaluation
│   │   └── tasks/            # Celery background tasks
│   ├── migrations/           # Alembic database migrations
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/              # Next.js pages (App Router)
│       ├── components/       # React components (UI, charts, dashboard)
│       └── lib/              # API client, utilities
├── data/
│   ├── uploads/              # Audio files
│   └── models/               # Trained ML model artifacts
├── docker-compose.yml
└── README.md
```

## Development

### Running Tests

```bash
cd backend
pytest
```

### Database Migrations

```bash
cd backend
# Create a new migration after model changes
alembic revision --autogenerate -m "description"
# Apply migrations
alembic upgrade head
```

### Adding New Features

1. Add SQLAlchemy model in `backend/app/models/`
2. Create Pydantic schemas in `backend/app/schemas/`
3. Implement service logic in `backend/app/services/`
4. Add API routes in `backend/app/api/routes/`
5. Create frontend page in `frontend/src/app/`
6. Run migrations: `alembic revision --autogenerate && alembic upgrade head`

## Privacy & Ethics

- Always obtain consent before recording calls
- Anonymize or redact sensitive customer data
- Comply with GDPR, CCPA, and local data protection regulations
- Audio files are stored locally and never shared with third parties beyond the STT API
