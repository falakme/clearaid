# ClearAid

**Proactive crisis navigation and bureaucratic translation for displaced families.**

ClearAid is a Crisis-to-Action Translator (USAII Global AI Hackathon — High School Track,
Direction A). It turns dense government relief paperwork (FEMA housing forms, NGO aid
terms) into a calm, actionable checklist for exhausted, displaced parents.

---

## Architecture

```
┌──────────────────────┐      ┌───────────────────────┐      ┌──────────────┐
│  Next.js 14 PWA      │ HTTP │  FastAPI backend       │      │  PostgreSQL  │
│  (browser)           │─────▶│  /api/translate-form   │      │  (NON-PII    │
│  - LocalStorage only │      │  /api/alerts           │─────▶│   alerts     │
│    for user profile  │      │  /api/health           │      │   only)      │
└──────────────────────┘      └───────────┬────────────┘      └──────────────┘
                                          │
                                          ▼
                            NVIDIA Build API
                            google/gemma-3n-e4b-it
```

## Responsible AI safeguards

1. **Zero PII backend storage** — ZIP, city, and family size live ONLY in the browser's
   `localStorage`. Postgres stores nothing but mocked, non-personal disaster alerts.
2. **Human-in-the-loop** — ClearAid translates forms into a to-do list but never
   auto-submits. The user gathers their own documents and clicks through to the
   official government portal themselves.
3. **Source transparency** — Every translation includes a "Show Legal Source" toggle
   exposing the exact quote the AI used, guarding against hallucinated deadlines.

## Tech stack

| Layer    | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn-style UI, PWA |
| Backend  | Python, FastAPI, Pydantic, SQLAlchemy                            |
| Database | PostgreSQL (non-PII alerts)                                      |
| AI       | NVIDIA Build API — `google/gemma-3n-e4b-it`                      |
| Infra    | Docker Compose (Coolify-compatible)                             |

---

## Quick start (local)

```bash
cp .env.example .env
# Add your NVIDIA_API_KEY to .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs
- Admin demo panel: http://localhost:3000/admin/mock-alerts

### Running services individually (dev)

Backend (works on **Python 3.9+**):
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Demo flow (for the pitch video)

1. Open the app → onboard with a ZIP code + family size (saved to LocalStorage).
2. Land on the dashboard → see active alerts + a Relief To-Do list.
3. Open the **Admin panel** (`/admin/mock-alerts`) in another tab → trigger a disaster
   alert. The dashboard reflects the new crisis state.
4. Click an aid program → paste a mock FEMA terms block → watch ClearAid translate it
   into a Bottom Line, Deadline, Checklist, and a verifiable Legal Source.

## Deploying on Coolify

1. Create a new **Docker Compose** resource pointing at this repo.
2. Set environment variables in the Coolify UI (see `.env.example`), especially
   `NVIDIA_API_KEY`, `CORS_ORIGINS` (your public frontend URL), and
   `NEXT_PUBLIC_API_BASE_URL` (your public backend URL).
3. Deploy. Coolify builds all three services from this compose file.
