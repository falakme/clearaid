# ClearAid — Engineering Blueprint

**Direction A: Crisis-to-Action Translator.** ClearAid converts unstructured
administrative, legal, medical, and financial documents into a structured,
interactive workspace: an urgency classification, a plain-language brief, a
full Markdown explanation, a stateful task list, a conditional data table, a
step-by-step process visualizer, and an AI-evaluated "Verified Local Support"
recommendation — all behind a Responsible-AI, human-in-the-loop gate.

ClearAid is **stateless and frictionless**: no login, no onboarding, no
location tracking, and no database. Documents are processed in memory for the
lifetime of a single request and never persisted.

---

## 1. System Architecture & Stack

Containerized, decoupled monorepo. Two services orchestrated by Docker Compose
and deployable as a single resource on self-hosted **Coolify**. The frontend
and backend are independently buildable and communicate over HTTP/JSON.

| Layer | Technology | Responsibility |
| ----- | ---------- | -------------- |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn-style UI | Multimodal intake, dynamic component hydration, client state. PWA app shell + offline translation caching. |
| **Backend API** | Python, FastAPI, Pydantic | Async routing, MIME routing, OCR/text extraction, two-step inference orchestration, strict schema validation. |
| **Cognitive Engine** | NVIDIA Build API — `google/gemma-3n-e4b-it` | OpenAI-compatible `/chat/completions`; used twice per request (extraction + resource evaluation). |
| **Retrieval** | Brave Search API | Live retrieval for the agentic recommendation engine (optional). |

### Service topology

```
┌────────────────────────────┐        ┌────────────────────────────┐
│ frontend  (Next.js :3000)  │  HTTP  │ backend  (FastAPI :8000)   │
│  - App Router / PWA / SW   │ ─────▶ │  - /api/translate-form     │
│  - same-origin /api proxy  │ files  │  - /api/health             │
└────────────────────────────┘        └─────────────┬──────────────┘
                                                     │ OpenAI-compatible POST
                                          ┌──────────┴───────────┐
                                          ▼                      ▼
                       NVIDIA · gemma-3n-e4b-it        Brave Search API
                       (extract + evaluate)            (retrieval)
```

There is no database service. The app persists nothing.

---

## 2. The End-to-End Data Pipeline

### Step 1 — Multimodal Intake
The intake screen (`components/translator/intake-view.tsx`) accepts pasted/typed
text, a **PDF** upload, an **image** upload (PNG/JPG/WEBP), or a **mobile camera
capture**. An optional **location** field scopes the resource recommendation.
The payload is packaged as `multipart/form-data` and POSTed to
`POST /api/translate-form`.

### Step 2 — Format Routing & OCR Extraction
FastAPI (`app/routers/translate.py`) routes the upload through
`app/services/extract.py`:

| Input | Extractor | Library |
| ----- | --------- | ------- |
| `application/pdf` | embedded-text extraction | `pypdf` |
| `image/*` | OCR | `pytesseract` + `Pillow` |
| pasted text | passthrough | — |

A 10 MB ceiling is enforced; unsupported/empty/unreadable inputs return a clean
**HTTP 422**. SSNs are redacted (`app/services/pii.py`) before anything leaves
the backend.

### Step 3 — Inference (multi-capability extraction)
`app/services/nvidia.py` composes a strict system prompt and calls
`gemma-3n-e4b-it` (`temperature=0.2`, `top_p=0.7`, `max_tokens=2048`). The model
returns a single JSON object that demonstrates four capabilities:

- **Classification** — `urgency_tier` (`Urgent Action Required` |
  `Time Sensitive` | `Informational Only`) and a `document_category`.
- **Summarization** — `plain_language_brief`.
- **Extraction** — `plain_language_explanation_markdown`, `task_list`,
  `table_data`, `diagram_steps`, plus `detected_location` and
  `ai_confidence_score`.

A defensive parser strips fences, balances braces, repairs trailing commas, and
retries once before failing with a clean **HTTP 502**.

### Step 4 — Agentic Resource Recommendation (Retrieval-Augmented Evaluation)
1. **Retrieval** — `app/services/brave.py` builds a query from the classified
   `document_category` + location (e.g. `site:211.org tenant legal aid {loc}`,
   `Feeding America local food pantry SNAP {loc}`) and fetches live results.
2. **AI evaluation** — the raw search hits (title, url, description) are fed
   back into `gemma-3n-e4b-it`, which selects the **single** most relevant and
   trustworthy resource and explains why. This populates
   `recommended_resource_name`, `recommended_resource_url`, and
   `ai_reasoning_for_recommendation`. The chosen URL is validated against the
   retrieved set. This step is best-effort — failure never breaks the response.

### Step 5 — Dynamic UI Hydration
The client conditionally hydrates Shadcn-style modules from the populated
fields. External actions are gated behind the Responsible-AI checkbox (§5).

### Canonical inference schema (extraction step)

```json
{
  "urgency_tier": "Urgent Action Required",
  "document_category": "eviction",
  "plain_language_brief": "string",
  "plain_language_explanation_markdown": "string (Markdown, no emojis)",
  "task_list": [{ "id": 1, "task": "string" }],
  "table_data": { "headers": ["string"], "rows": [["string"]] },
  "diagram_steps": [{ "step_number": 1, "title": "string", "description": "string" }],
  "detected_location": "string",
  "ai_confidence_score": "High"
}
```

The serialized API response additionally carries backend-attached
`confidence_percent`, the `recommended_resource_*` fields, and `source_text`
(exact extracted text) for the Source Transparency engine.

### API surface

| Method | Route | Auth | Purpose |
| ------ | ----- | ---- | ------- |
| `POST` | `/api/translate-form` | none | Multimodal intake → structured translation + recommendation |
| `GET`  | `/api/health` | none | Liveness + NVIDIA/Brave configuration status |

---

## 3. Access Model

ClearAid is fully **anonymous and frictionless** — there is no authentication,
no onboarding, and no role-based access. Visiting the site drops the user
straight into the translator. The only client-side state is checklist progress,
stored in `localStorage` (device-only) and clearable with one tap.

---

## 4. Frontend Rendering Engine

The UI is a **mobile-first PWA with two states**, orchestrated by
`components/translator/translator-app.tsx`, which owns all shared,
progress-bearing state (the result, ELI5/language controls, checklist ticks,
and the Responsible-AI acknowledgement) so it survives tab switches.

- **State 0 — Intake** (`translator/intake-view.tsx`): a full-viewport screen.
  **Judge Demo Mode** sits at the top as a collapsible, horizontally-scrollable
  carousel of one-tap loaders — **Load Eviction Crisis**, **Load Hospital
  Discharge**, **Load Food Assistance** — each auto-populating a complex
  synthetic document and immediately running the full pipeline (`lib/demo-docs.ts`).
- **State 1 — Dashboard** (`translator/dashboard-view.tsx`): a `max-w-md`,
  full-height app column with a compact header and a **floating glassmorphic
  bottom navigation** (`translator/bottom-nav.tsx`, `backdrop-blur` + `bg-white/80`)
  exposing four icon tabs.

The validated JSON hydrates discrete, conditional modules, distributed across
the four tabs:

| Tab | View | Modules |
| --- | ---- | ------- |
| **Summary** | `tabs/summary-tab.tsx` | ELI5/language controls, urgency banner (`urgency_tier` + `plain_language_brief`), Markdown explanation (`ui/markdown.tsx`), conditional breakdown table (`translator/data-table.tsx`). |
| **Tasks** | `tabs/tasks-tab.tsx` | Process visualizer (`translator/process-diagram.tsx`), interactive checklist (`translator/task-list.tsx`, controlled), and the Source Transparency toggle. |
| **Resources** | `tabs/resources-tab.tsx` | Agentic "Verified Local Support" card and the Responsible AI & Human-in-the-Loop block; the gated "Open verified resource" action. |
| **Settings** | `tabs/settings-tab.tsx` | "Translate another document" (reset to State 0), "Erase my data" (localStorage clear), disclaimers. |

State is lifted into the orchestrator and the checklist (`translator/task-list.tsx`)
is a **controlled** component, so switching tabs never wipes progress.

---

## 5. Responsible AI Protocols

- **Source Transparency Engine.** The result view exposes the exact source
  string (`source_text`) the explanation was derived from, so every claim can be
  verified against the original document.
- **Responsible AI & Human-in-the-Loop gateway.** A distinct amber-bordered
  container shows an AI confidence indicator (`confidence_percent`) and a
  **mandatory acknowledgement checkbox**. All external action buttons (open the
  verified resource, share the plan) stay **disabled** until the user confirms
  they will use the summary only as an organizational guide and that it is not
  official medical or legal advice.
- **No automated submission.** ClearAid clarifies and organizes only; it never
  submits, signs, or acts on the user's behalf.

---

## 6. Local Development & Deployment

### Repository structure

```
clearaid/
├── docker-compose.yml          # 2-service orchestration (frontend, backend)
├── .env.example                # all environment variables
├── backend/
│   ├── Dockerfile              # python:3.12-slim + tesseract-ocr
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app, CORS, router mounts
│       ├── config.py           # pydantic-settings (env)
│       ├── schemas.py          # Pydantic: TranslateResponse, Health
│       ├── routers/
│       │   ├── translate.py    # intake + MIME routing + recommendation
│       │   └── health.py       # status probe
│       └── services/
│           ├── extract.py      # pypdf / pytesseract text extraction
│           ├── pii.py          # SSN redaction
│           ├── brave.py        # retrieval (Brave Search)
│           └── nvidia.py       # prompts, inference, JSON repair, evaluation
└── frontend/
    ├── Dockerfile              # multi-stage Next.js standalone
    ├── app/                    # App Router page + /api proxies
    ├── components/             # ui/, translator/, motion
    ├── lib/                    # api, types, demo-docs, storage, text, motion
    └── public/                 # manifest.json, sw.js, icons
```

### Run the full stack (Docker)

```bash
cp .env.example .env            # then set NVIDIA_API_KEY (and optionally BRAVE_API_KEY)
docker compose up -d --build    # frontend :3000 · backend :8000
```

### Run services individually (dev)

Backend (Python 3.12):

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

### Deployment (Coolify)

1. Create a **Docker Compose** resource pointing at this repository.
2. Populate the environment variables from `.env.example` in the Coolify UI.
   `NEXT_PUBLIC_*` values are baked into the browser bundle at build time.
3. Deploy. The backend image provisions the `tesseract-ocr` binary for OCR.
