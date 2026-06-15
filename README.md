# ClearAid

**Paperwork, made plain — from disaster relief to everyday bureaucracy.**

ClearAid (USAII Global AI Hackathon — High School Track) turns dense, confusing
documents — **eviction notices, school communications, housing forms, medical bills,
and disaster relief paperwork** — into a calm, plain-language checklist. Users upload a
PDF, snap a photo, or paste text; ClearAid extracts the text (OCR for images), clarifies
the jargon, and formats the next steps. It **audits and clarifies only** — never giving
medical or legal advice, and never submitting anything on the user's behalf.

---

## Architecture

```
┌──────────────────────┐      ┌───────────────────────┐      ┌──────────────┐
│  Next.js 14 PWA      │ HTTP │  FastAPI backend       │      │  PostgreSQL  │
│  (browser)           │─────▶│  /api/translate-form   │      │  (NON-PII    │
│  - LocalStorage only │ file │   (text / PDF / image) │      │   alerts     │
│  - optional Clerk    │ +OCR │  /api/alerts /health   │─────▶│   only)      │
└──────────────────────┘      └───────────┬────────────┘      └──────────────┘
                                          │ pypdf / pytesseract → raw text
                                          ▼
                            NVIDIA Build API
                            google/gemma-3n-e4b-it
```

## Document modules

| Module | Doc type | Access |
| ------ | -------- | ------ |
| Emergency Housing / Red Cross / Utility relief | `emergency` | Always anonymous |
| Eviction Notice Translator | `eviction` | Gated* |
| Medical Bill Auditor | `medical_bill` | Gated* |
| School Communication | `school` | Gated* |
| Housing Form Helper | `housing` | Gated* |

\*Gated modules require a quick Clerk sign-in **unless an active emergency is present**
for the user's area (then they're anonymous, to remove friction in a crisis).

## Multimodal intake

The Translator accepts a **PDF**, an **image (PNG/JPG)**, a **camera photo** (mobile), or
pasted text. The backend extracts text with `pypdf` (PDFs) or `pytesseract` OCR (images)
before sending it to the model. Extracted text is held in memory only — never stored.

## Conditional authentication (Clerk)

- **Active emergency** in the user's area → emergency tools open instantly, no login.
- **No emergency** → high-compute modules (Medical Bill Auditor, Eviction Translator,
  etc.) ask for a quick Clerk sign-in as a guardrail against API abuse.
- Clerk is **optional**: with no keys set, the app runs with gating disabled (demo mode).

## Responsible AI safeguards

1. **Zero PII backend storage** — ZIP, city, and family size live ONLY in the browser's
   `localStorage`. Postgres stores nothing but mocked, non-personal disaster alerts.
   Uploaded documents are converted to text in memory and never persisted.
2. **Human-in-the-loop** — ClearAid translates documents into a to-do list but never
   auto-submits. It clarifies jargon and formats checklists; it does **not** give medical
   or legal advice (the Medical Bill Auditor carries an explicit disclaimer).
3. **Source transparency** — Every translation includes a "Show Legal Source" toggle
   exposing the exact quote the AI used, guarding against hallucinated deadlines.

## Tech stack

| Layer    | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn-style UI, PWA, Clerk |
| Backend  | Python, FastAPI, Pydantic, SQLAlchemy, pypdf, pytesseract        |
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

## Admin console

A hidden, demo-only console (linked from **Settings → Open admin console**) provides
full control for the pitch. All data it touches is non-PII.

- **`/admin`** — Overview: live system status (backend, database, NVIDIA AI config,
  version) plus quick actions to load demo alerts or clear all alerts.
- **`/admin/mock-alerts`** — Alerts manager: create, **edit**, activate/deactivate,
  and delete alerts, with one-click presets.
- **`/admin/translate`** — AI pipeline tester: send raw form text to
  `POST /api/translate-form` and inspect the parsed fields and raw JSON.

Admin mutations are proxied through Next.js server routes that inject `ADMIN_API_KEY`,
so the key is never exposed to the browser.

## PWA

ClearAid is an installable Progressive Web App: web manifest, PNG + maskable icons
(192/512), Apple touch icon, theme color, a service worker (offline app shell; API
responses are never cached so crisis data stays fresh), push-notification handling,
and an in-app "Add to Home Screen" prompt.

## Demo flow (for the pitch video)

1. Open the app → onboard with a ZIP code + family size (saved to LocalStorage).
2. Land on the dashboard → see active alerts + a Relief To-Do list.
3. Open the **Admin console** (`/admin`) in another tab → trigger a disaster alert.
   The dashboard reflects the new crisis state live.
4. Click an aid program → paste a mock FEMA terms block → watch ClearAid translate it
   into a Bottom Line, Deadline, Checklist, and a verifiable Legal Source.

## Deploying on Coolify

1. Create a new **Docker Compose** resource pointing at this repo.
2. Set environment variables in the Coolify UI (see `.env.example`), especially
   `NVIDIA_API_KEY`, `CORS_ORIGINS` (your public frontend URL), and
   `NEXT_PUBLIC_API_BASE_URL` (your public backend URL).
3. Deploy. Coolify builds all three services from this compose file.
