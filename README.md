# ClearAid — Engineering Blueprint

ClearAid is a document-translation system that converts unstructured administrative,
legal, and financial documents into a structured, interactive workspace (Markdown
explanation, stateful task list, conditional data table, and a step-by-step process
visualizer). This document specifies the system architecture, the end-to-end data
pipeline, the role-based access model, the frontend rendering engine, the Responsible
AI guardrails, and local development/deployment.

---

## 1. System Architecture & Stack

Containerized, decoupled monorepo. Three services are orchestrated by Docker Compose and
deployed as a single resource on self-hosted **Coolify**. The frontend and backend are
independently buildable and communicate over HTTP/JSON.

| Layer | Technology | Responsibility |
| ----- | ---------- | -------------- |
| **Frontend Application** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn-style UI | Multimodal intake, dynamic component hydration, client state. Configured as a **PWA** with a native service worker (offline app shell + Web Push API handlers). |
| **Backend API** | Python, FastAPI, Pydantic | Async routing, MIME routing, OCR/text extraction, inference orchestration, strict schema validation. |
| **Database Layer** | PostgreSQL (Docker Compose) | **Non-PII only.** Stores localized emergency alerts. No user documents or profile data are ever persisted. |
| **Cognitive Engine** | NVIDIA Build API — `google/gemma-3n-e4b-it` | Inference via an OpenAI-compatible `/chat/completions` interface returning a strict JSON object. |

### Service topology

```
┌────────────────────────────┐        ┌────────────────────────────┐        ┌───────────────┐
│ frontend  (Next.js :3000)  │  HTTP  │ backend  (FastAPI :8000)   │  SQL   │ db (Postgres) │
│  - App Router / PWA / SW   │ ─────▶ │  - /api/translate-form     │ ─────▶ │  :5432        │
│  - server-side admin proxy │ files  │  - /api/alerts /api/health │        │  alerts only  │
└────────────────────────────┘        └─────────────┬──────────────┘        └───────────────┘
                                                     │ OpenAI-compatible POST
                                                     ▼
                                    NVIDIA Build API · google/gemma-3n-e4b-it
```


---

## 2. The End-to-End Data Pipeline

Lifecycle of a single document, from capture to rendered workspace.

### Step 1 — Multimodal Intake
The Next.js client (`components/translator/file-intake.tsx`) accepts:
- **PDF** upload,
- **Image** upload (PNG / JPG / WEBP),
- **Mobile camera capture** via `<input type="file" accept="image/*" capture="environment">`,
- or direct **pasted text**.

The payload is packaged as `multipart/form-data` (`file`, `text`, `doc_type`) and POSTed
to `POST /api/translate-form`. No `Content-Type` header is set manually so the browser
emits the correct multipart boundary.

### Step 2 — Format Routing & OCR Extraction
FastAPI (`app/routers/translate.py`) inspects the upload's MIME type / extension and
routes it through `app/services/extract.py`:

| Input | Extractor | Library |
| ----- | --------- | ------- |
| `application/pdf` | embedded-text extraction | `pypdf` |
| `image/png`, `image/jpeg`, `image/webp` | OCR | `pytesseract` (+ `tesseract-ocr` system binary) + `Pillow` |
| pasted text | passthrough | — |

A 10 MB ceiling is enforced. Unsupported types, empty files, textless (scanned) PDFs,
and unreadable images return a clean **HTTP 422** with an actionable message — never a
500. Extracted text exists only in process memory for the request lifetime.

### Step 3 — Inference Execution
The extracted text is composed into a strict system prompt (`app/services/nvidia.py`)
and dispatched to the NVIDIA `gemma-3n-e4b-it` endpoint
(`temperature=0.2`, `top_p=0.7`, `max_tokens=2048`, `stream=false`). The prompt mandates
a pure JSON object and explicitly forbids markdown code fences, conversational tokens,
and emojis. An optional per-`doc_type` system note layers domain specialization (e.g.
medical billing) without altering the canonical schema.

### Step 4 — Response Validation
The raw completion is parsed by a defensive extractor: it strips stray code fences,
performs string-aware brace matching to isolate the first balanced JSON object, repairs
trailing commas, and — on failure — issues **one corrective retry**. The parsed object is
coerced into the Pydantic `TranslateResponse` model (keys for markdown, task list, table
data, and diagram steps), emojis are stripped server-side, and the backend attaches the
exact `source_text` for provenance. Unrecoverable model output yields a clean **HTTP 502**.

### Step 5 — Dynamic UI Hydration
The client receives the validated JSON and conditionally hydrates Shadcn-style components
based on which arrays are populated (see §4). Empty arrays render nothing.


### Canonical inference schema

The model is constrained to return exactly this object:

```json
{
  "plain_language_explanation_markdown": "string (Markdown, no emojis)",
  "task_list": [{ "id": 1, "task": "string" }],
  "table_data": {
    "headers": ["string"],
    "rows": [["string", "string"]]
  },
  "diagram_steps": [
    { "step_number": 1, "title": "string", "description": "string" }
  ]
}
```

The serialized API response additionally carries a backend-attached
`source_text` field (the exact extracted text) used by the Source Transparency engine.

### API surface

| Method | Route | Auth | Purpose |
| ------ | ----- | ---- | ------- |
| `POST` | `/api/translate-form` | none | Multimodal intake → structured translation |
| `GET`  | `/api/alerts` | none | Read active localized alerts |
| `POST` / `PATCH` / `DELETE` | `/api/alerts*` | admin key | Write/manage alerts (server-proxied) |
| `GET`  | `/api/health` | none | Liveness + DB/NVIDIA status |

---

## 3. Authentication Matrix & Data Isolation

Three-tier RBAC. PII never crosses the client boundary; the database stores only
non-personal alert records.

| Tier | Identity | Auth | Protected surface | Authorized actions |
| ---- | -------- | ---- | ----------------- | ------------------ |
| **1 — Anonymous User** (victims / general citizens) | none | Zero-friction, no login | Public translation tools | Translate documents. Location/demographics held **only** in browser `LocalStorage`; **no PII** transmitted to or stored in Postgres. |
| **2 — ER Teams** (local responders) | Clerk session | Clerk auth | `/er-dashboard` | `POST` localized disaster alerts into Postgres. |
| **3 — System Admin** | Clerk session + admin metadata flag | Clerk auth (verified `publicMetadata.role === "admin"`) | `/admin-panel` | Full CRUD over ER Team accounts, system-wide alert logs, and database overrides. |

### Data isolation invariants
- User documents are processed in memory and **never** written to disk or DB.
- The browser is the sole store of profile/location data (`LocalStorage`).
- Admin/ER mutations are proxied through Next.js server routes that inject the privileged
  key server-side, so no credential is exposed to the browser bundle.

> **Current implementation note.** Tiers 2/3 are realized today by the Clerk gate
> (`components/auth/module-gate.tsx`) and the admin console under `/admin`
> (`/admin/mock-alerts` for alert writes, `/admin/translate` for pipeline inspection).
> `/er-dashboard` and `/admin-panel` are the canonical RBAC routes targeted by this
> blueprint. When Clerk keys are absent, gating is disabled (open demo mode).


---

## 4. Frontend Rendering Engine

The validated JSON is hydrated into discrete, independently-rendered modules. Each module
is **conditional** — it mounts only when its backing array is populated.

| Module | Component | Behavior |
| ------ | --------- | -------- |
| **Markdown Module** | `components/ui/markdown.tsx` | Renders `plain_language_explanation_markdown` via `react-markdown` + `remark-gfm`. Raw HTML is disabled. Emojis are programmatically stripped (`lib/text.ts`) for a clean, professional surface. Element styling is applied through Tailwind component overrides. |
| **Stateful Task List** | `components/translator/task-list.tsx` | Native checkbox list bound to a `<Progress>` bar. Check state is tracked in component state and persisted per-module to `LocalStorage` (device-only). |
| **Conditional Data Table** | `components/translator/data-table.tsx` | Renders a Shadcn-style `<Table>` for fee breakdowns / eligibility matrices. **Renders nothing** when `table_data.headers` is empty. |
| **Process Visualizer** | `components/translator/process-diagram.tsx` | Chronological timeline/flowchart built from plain Tailwind blocks — numbered nodes joined by CSS connector lines — mapping `diagram_steps` into a sequential path. |

### Failsafes
- `table_data.headers.length === 0` → the table container is not mounted.
- `diagram_steps.length === 0` → the visualizer is not mounted.
- `task_list.length === 0` → the checklist is not mounted.
- The Markdown explanation always renders, falling back to a neutral message if absent.

---

## 5. Responsible AI Protocols

- **Source Transparency Engine.** To mitigate hallucination risk around legal deadlines
  and financial figures, the result view exposes a toggle that retrieves and displays the
  exact source string the explanation was derived from (`source_text`, captured at
  extraction time). Users can verify every generated claim against the original document.
- **Human-in-the-Loop Enforcement.** The API is a strictly read-only translation and
  organization layer. There is **zero** automated submission logic anywhere in the
  backend; the user retains absolute manual control over signing and submitting any
  document. The system clarifies and formats — it does not act, and it does not give
  medical or legal advice.


---

## 6. Local Development & Deployment

### Repository structure

```
clearaid/
├── docker-compose.yml          # 3-service orchestration (frontend, backend, db)
├── .env.example                # all environment variables
├── backend/
│   ├── Dockerfile              # python:3.12-slim + tesseract-ocr
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app, CORS, lifespan, router mounts
│       ├── config.py           # pydantic-settings (env)
│       ├── database.py         # SQLAlchemy engine/session
│       ├── models.py           # Alert ORM (non-PII)
│       ├── schemas.py          # Pydantic: TranslateResponse, Alert*, Health
│       ├── seed.py             # demo alert seeding
│       ├── routers/
│       │   ├── translate.py    # multipart intake + MIME routing
│       │   ├── alerts.py       # alert CRUD (admin-guarded)
│       │   └── health.py       # status probe
│       └── services/
│           ├── extract.py      # pypdf / pytesseract text extraction
│           └── nvidia.py       # prompt, inference, JSON repair, normalize
└── frontend/
    ├── Dockerfile              # multi-stage Next.js standalone
    ├── middleware.ts           # conditional Clerk middleware
    ├── app/                    # App Router pages + /api admin proxies
    ├── components/             # ui/, translator/, auth/, motion
    ├── lib/                    # api, types, storage, text, motion, auth
    └── public/                 # manifest.json, sw.js, icons
```

### Run the full stack (Docker)

```bash
cp .env.example .env            # then set NVIDIA_API_KEY
docker-compose up -d --build    # frontend :3000 · backend :8000 · db :5432
```

### Run services individually (dev)

Backend (Python 3.9+; image uses 3.12):

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
npm run dev                     # http://localhost:3000
```


### `.env.example`

```env
# ── PostgreSQL (non-PII alert storage) ──────────────────────────────
POSTGRES_USER=clearaid
POSTGRES_PASSWORD=clearaid_dev_pw
POSTGRES_DB=clearaid
# SQLAlchemy URL used by the backend (psycopg v3 driver):
DATABASE_URL=postgresql+psycopg://clearaid:clearaid_dev_pw@db:5432/clearaid

# ── Cognitive Engine (NVIDIA Build API) ─────────────────────────────
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=google/gemma-3n-e4b-it

# ── Backend service config ──────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000      # comma-separated
ADMIN_API_KEY=clearaid_admin_dev_key    # guards alert mutation endpoints
MAX_UPLOAD_MB=10                         # OCR upload ceiling

# ── Frontend → backend wiring ───────────────────────────────────────
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000   # browser → backend (build-time)
BACKEND_INTERNAL_URL=http://backend:8000         # SSR proxy → backend (container net)

# ── Authentication (Clerk) — OPTIONAL ───────────────────────────────
# Leave empty to run fully anonymous (auth gating disabled / demo mode).
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_<your-clerk-publishable-key>
CLERK_SECRET_KEY=sk_test_<your-clerk-secret-key>
# Optional Clerk route overrides:
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### Deployment (Coolify)

1. Create a **Docker Compose** resource pointing at this repository.
2. Populate the environment variables above in the Coolify UI. `NEXT_PUBLIC_*` values are
   baked into the browser bundle at build time and must be set before the build step.
3. Deploy. Coolify builds all three images from `docker-compose.yml`. The backend image
   provisions the `tesseract-ocr` binary required by the OCR fallback layer.
