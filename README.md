# ClarityAI

**Direction A: Crisis-to-Action Translator.** ClarityAI converts unstructured
administrative, legal, medical, and financial documents into a structured,
interactive workspace: an urgency classification, a plain-language brief, a
full Markdown explanation, a stateful task list, a conditional data table, a
step-by-step process visualizer, and an AI-evaluated "Verified Local Support"
recommendation — all behind a Responsible-AI, human-in-the-loop gate, and all
fully localizable into 15 languages.

ClarityAI is **stateless and frictionless**: no login, no onboarding, no
location tracking, and no database. Documents are processed in memory for the
lifetime of a single request and never persisted.

---

## 1. System Architecture & Stack

Containerized, decoupled monorepo. Two services orchestrated by Docker Compose
and deployable as a single resource on self-hosted **Coolify**. The frontend
and backend are independently buildable and communicate over HTTP/JSON.

| Layer | Technology | Responsibility |
| ----- | ---------- | -------------- |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn-style UI, Framer Motion | Multimodal intake, dynamic component hydration, client state, 15-language UI localization, fluid micro-interactions. PWA app shell + offline translation caching. |
| **Backend API** | Python, FastAPI, Pydantic | Async routing, MIME routing, OCR/text extraction, two-step inference orchestration, TTS proxy, strict schema validation. |
| **Cognitive Engine** | NVIDIA Build API — `google/gemma-3n-e4b-it` | OpenAI-compatible `/chat/completions`; used twice per request (extraction + resource evaluation), with the active output language injected into the prompt. |
| **Retrieval** | Brave Search API | Live retrieval for the agentic recommendation engine (optional). |
| **Speech (TTS)** | Microsoft Azure Cognitive Services (neural voices) | Premium English read-aloud, proxied server-side; falls back to the browser Web Speech engine when unconfigured. |
| **Speech (STT)** | Browser Web Speech API + Web Audio | Client-side voice intake with a live audio visualizer (offline, no upload). |

### Service topology

```
┌────────────────────────────┐        ┌────────────────────────────┐
│ frontend  (Next.js :3000)  │  HTTP  │ backend  (FastAPI :8000)   │
│  - App Router / PWA / SW   │ ─────▶ │  - /api/translate-form     │
│  - same-origin /api proxy  │ files  │  - /api/recommend          │
│  - 15-language i18n        │  JSON  │  - /api/tts (Azure proxy)  │
│  - Framer Motion           │ audio  │  - /api/health             │
└────────────────────────────┘        └─────────────┬──────────────┘
                                                     │ OpenAI-compatible POST
                                  ┌──────────────────┼───────────────────┐
                                  ▼                   ▼                   ▼
               NVIDIA · gemma-3n-e4b-it       Brave Search API     Azure Cognitive
               (extract + evaluate,           (retrieval)          Services TTS
                language-aware)                                    (neural voice)
```

There is no database service. The app persists nothing.

---

## 2. The End-to-End Data Pipeline

### Step 1 — Multimodal Intake
The intake screen (`components/translator/intake-view.tsx`) accepts pasted/typed
text, a **PDF** upload, an **image** upload (PNG/JPG/WEBP), or a **mobile camera
capture**, plus a **voice intake** mode. The voice panel
(`components/translator/smart-input.tsx`) transcribes with the browser Web
Speech API and renders a live Web-Audio visualizer; its modal uses an explicit
dark (`bg-slate-900`) surface with high-contrast white/`blue-200` text so it is
always legible. An optional **location** field scopes the resource
recommendation. The payload is packaged as `multipart/form-data` and POSTed to
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

### Step 3 — Inference (multi-capability, language-aware extraction)
`app/services/nvidia.py` composes a strict system prompt and calls
`gemma-3n-e4b-it` (`temperature=0.2`, `top_p=0.7`, `max_tokens=2048`). When the
user has selected a non-English output language, an additional system message
instructs the model to translate **every human-readable value** — the brief,
the Markdown explanation, every task, the table headers/cells, and the diagram
titles/descriptions — into that language, while keeping machine fields
(`urgency_tier`, `document_category`, `detected_location`,
`ai_confidence_score`) in English. The model returns a single JSON object that
demonstrates four capabilities:

- **Classification** — `urgency_tier` (`Urgent Action Required` |
  `Time Sensitive` | `Informational Only`) and a `document_category`.
- **Summarization** — `plain_language_brief`.
- **Extraction** — `plain_language_explanation_markdown`, `task_list`,
  `table_data`, `diagram_steps`, plus `detected_location` and
  `ai_confidence_score`.

A defensive parser strips fences, balances braces, repairs trailing commas, and
retries once before failing with a clean **HTTP 502**.

### Step 4 — Autonomous Agentic RAG Architecture
1. **IP Geolocation** — Resolves the user's City/State/Country via `ip-api.com` using their request IP, giving the agent real-world localization without asking the user.
2. **Autonomous Intent Research** — If the user provides a text prompt (e.g., "I got evicted"), the backend automatically performs a live Brave Search (incorporating the IP-geolocated context) and injects the top results directly into the LLM context. No file upload is strictly required.
3. **Multi-Document & Hybrid Processing** — Users can upload multiple documents simultaneously. The extracted text is concatenated into a single context block. The system seamlessly handles hybrid contexts (multiple uploaded files + user text + autonomous web search results) in a single unified prompt.

### Step 5 — Read-Aloud (Azure Neural TTS, English)
The Summary tab's **Listen** control (`components/listen-button.tsx`) POSTs the
plain-language summary to `POST /api/tts`. The backend
(`app/services/azure_tts.py`) wraps the text in SSML and proxies it to Azure
Cognitive Services, streaming back MP3 audio with a premium neutral English
neural voice (`en-US-JennyNeural` by default). Read-aloud is **English-only** by
design. When `AZURE_TTS_KEY` is not configured the endpoint returns **HTTP 503**
and the client transparently falls back to the browser's Web Speech synthesis,
so read-aloud always works.

### Step 6 — Dynamic UI Hydration
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
| `POST` | `/api/translate-form` | none | Multimodal intake → structured, language-aware translation |
| `POST` | `/api/recommend` | none | Agentic "Verified Local Support" (Brave retrieval + AI evaluation) |
| `POST` | `/api/tts` | none | Azure neural TTS proxy → streams MP3 (English; 503 when unconfigured) |
| `GET`  | `/api/health` | none | Liveness + NVIDIA/Brave/Azure-TTS configuration status |

---

## 3. Access Model

ClarityAI is fully **anonymous and frictionless** — there is no authentication,
no onboarding, and no role-based access. Visiting the site drops the user
straight into the translator. The only client-side state is checklist progress,
stored in `localStorage` (device-only) and clearable with one tap.

---

## 4. Frontend Rendering Engine

The UI is a **mobile-first PWA with real routes**, orchestrated by
`lib/translator-context.tsx` (`<TranslatorProvider>`, mounted in the root
`app/layout.tsx`). It owns all shared, progress-bearing state (the result,
ELI5/language controls, checklist ticks, and the Responsible-AI
acknowledgement) so it survives client-side navigation between the intake
screen and the dashboard routes.

- **Intake** (`/` → `app/page.tsx` + `translator/intake-view.tsx`): a
  full-viewport screen. **Judge Demo Mode** sits at the top as a collapsible,
  horizontally-scrollable carousel of one-tap loaders — **Load Eviction
  Crisis**, **Load Hospital Discharge**, **Load Food Assistance** — each
  auto-populating a complex synthetic document and immediately running the full
  pipeline (`lib/demo-docs.ts`). Submitting navigates to `/dash`.
- **Dashboard** (`/dash/*` → `app/dash/layout.tsx`): a persistent shell with a
  compact header, a desktop sidebar, and a **floating glassmorphic bottom
  navigation** (`translator/bottom-nav.tsx`, `backdrop-blur` + `bg-white/80`).
  Each section is its own route: `/dash` (Summary), `/dash/tasks`, `/dash/ask`
  (chat), `/dash/resources`, `/dash/history`, and `/dash/settings`.

The validated JSON hydrates discrete, conditional modules, distributed across
the four tabs:

| Tab | View | Modules |
| --- | ---- | ------- |
| **Summary** | `tabs/summary-tab.tsx` | Urgency banner (soft `rounded-xl` card), compact Markdown explanation (`ui/markdown.tsx`), AI-confidence pill, Listen (Azure TTS) control, conditional breakdown table (`translator/data-table.tsx`). |
| **Tasks** | `tabs/tasks-tab.tsx` | Compact process visualizer (`translator/process-diagram.tsx`, small numbered badges + thin connector), interactive checklist (`translator/task-list.tsx`, controlled), and the Source Transparency toggle. |
| **Resources** | `tabs/resources-tab.tsx` | Agentic "Verified Local Support" card and the Responsible AI & Human-in-the-Loop block; the gated "Open verified resource" action. Condensed to fit a single mobile viewport. |
| **Settings** | `tabs/settings-tab.tsx` | "Print / save as PDF", "Start a new document" (reset to State 0), "Erase my data" (localStorage clear), disclaimers. |

State is lifted into the orchestrator and the checklist (`translator/task-list.tsx`)
is a **controlled** component, so switching tabs never wipes progress.

**Responsive shell.** The dashboard adapts to the viewport: phones and tablets
get the floating bottom nav with a single content column; desktops (`lg+`) get
a persistent left sidebar, a wider centred column, and two-column tab layouts.
The intake screen is a two-column hero on desktop and a single stack on mobile.

**Compact type scale & safe areas.** Typography is tuned tight for small
viewports (compact headers, `text-xs`/`text-sm` body). The header pads with
`env(safe-area-inset-top)` and the floating bottom nav pads with
`env(safe-area-inset-bottom)`; the document sets `viewport-fit=cover` so insets
resolve on notched iOS/Android devices.

**Fluid micro-interactions (Framer Motion).** Tab switches animate with a subtle
horizontal slide-and-fade; the collapsed language menu scales smoothly into view
(`scale 0.95 → 1`, opacity fade); process-diagram steps stagger in; and the
intake/voice panels morph between states.

**Read-aloud, print, offline, install.** Read-aloud of the plain-language
summary via Azure neural TTS with a Web Speech fallback
(`components/listen-button.tsx`), one-tap **Print / Save as PDF** of a clean
takeaway sheet (`translator/printable-plan.tsx` + print stylesheet), an
**offline** indicator (`components/offline-badge.tsx`), and the installable PWA
shell with offline translation caching.

### Localization engine (15 languages)

Every static UI string — intake screen **and** dashboard chrome (tab names,
section headers, buttons, disclaimers) — is translated client-side from bundled
per-language dictionaries:

- **Dictionaries** — `frontend/locales/<code>.json`, one flat key→string map per
  language. Covered languages: English, Spanish, French, Arabic,
  Chinese (Simplified), Hindi, German, Portuguese, Vietnamese, Tagalog, Korean,
  Urdu, Bengali, Russian, and Haitian Creole.
- **Runtime** — `lib/i18n.ts` assembles the dictionaries into a lookup table and
  exposes `createTranslator(language)` (key → localized string, falling back to
  English then the raw key), `isRTL()` (Arabic/Urdu get `dir="rtl"`), and
  `speechLocale()` (BCP-47 locale for STT). The selector lives in
  `lib/languages.ts`; the header uses a compact icon-only popover
  (`components/language-menu.tsx`).
- **LLM output** — the same language is passed to the backend and injected into
  the gemma prompt (§2, Step 3), so the **generated** content (explanation,
  tasks, table, diagram) is translated server-side. Changing the language on the
  dashboard re-runs the translation in place. (Read-aloud audio remains English.)

---

## 5. Responsible AI Protocols

- **Source Transparency Engine.** The Tasks tab exposes the exact source string
  (`source_text`) the explanation was derived from, so every claim can be
  verified against the original document.
- **Responsible AI & Human-in-the-Loop gateway.** A distinct amber-bordered
  container shows an AI confidence indicator (`confidence_percent`) and a
  **mandatory acknowledgement checkbox**. All external action buttons (open the
  verified resource, share the plan) stay **disabled** until the user confirms
  they will use the summary only as an organizational guide and that it is not
  official medical or legal advice.
- **No automated submission.** ClarityAI clarifies and organizes only; it never
  submits, signs, or acts on the user's behalf.

---

## 6. Local Development & Deployment

### Repository structure

```
clarityai/
├── docker-compose.yml          # 2-service orchestration (frontend, backend)
├── .env.example                # all environment variables
├── backend/
│   ├── Dockerfile              # python:3.12-slim + tesseract-ocr, non-root user
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app, CORS, rate-limiter, router mounts
│       ├── config.py           # pydantic-settings (env)
│       ├── schemas.py          # Pydantic: TranslateResponse, Tts, Health
│       ├── ratelimit.py        # shared slowapi limiter instance
│       ├── routers/
│       │   ├── translate.py    # intake + MIME routing + recommendation
│       │   ├── tts.py          # Azure TTS proxy (MP3 stream)
│       │   └── health.py       # status probe
│       └── services/
│           ├── extract.py      # pypdf / pytesseract text extraction (threadpool)
│           ├── pii.py          # SSN redaction
│           ├── brave.py        # retrieval (Brave Search)
│           ├── azure_tts.py    # SSML build + Azure Cognitive Services call
│           ├── geolocation.py  # IP geolocation with validation
│           ├── prompts.py      # system prompts and per-domain hints
│           ├── parsing.py      # JSON repair, normalization, emoji strip
│           └── nvidia.py       # language-aware inference orchestrator
└── frontend/
    ├── Dockerfile              # multi-stage Next.js standalone
    ├── app/                    # App Router page + /api proxies (health, recommend, translate-form, tts)
    ├── components/             # ui/, translator/, language-menu, listen-button, motion
    ├── lib/
    │   ├── api.ts              # typed fetch helpers
    │   ├── types.ts            # shared TypeScript types
    │   ├── demo-docs.ts        # judge demo documents
    │   ├── storage.ts          # localStorage hooks
    │   ├── text.ts             # text utilities
    │   ├── motion.ts           # Framer Motion variants
    │   ├── i18n.ts             # translator + RTL + speech locale
    │   ├── languages.ts        # language list + native display names
    │   ├── use-speech-recognition.ts  # Web Speech API hook
    │   ├── use-audio-levels.ts        # Web Audio visualizer hook
    │   └── utils.ts            # cn(), isSafeHttpUrl()
    ├── locales/                # 15 per-language UI dictionaries (<code>.json)
    └── public/                 # manifest.json, sw.js, icons
```

### Environment variables

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `NVIDIA_API_KEY` | yes | Cognitive engine (extraction + evaluation). |
| `NVIDIA_BASE_URL` / `NVIDIA_MODEL` | no | Override the NVIDIA endpoint / model. |
| `BRAVE_API_KEY` | no | Enables the "Verified Local Support" recommendation. |
| `AZURE_TTS_KEY` | no | Enables Azure neural read-aloud; falls back to Web Speech when empty. |
| `AZURE_TTS_ENDPOINT` | no | Azure TTS REST endpoint. Must use the `tts.speech.microsoft.com` domain: `https://<region>.tts.speech.microsoft.com/cognitiveservices/v1`. The general `api.cognitive.microsoft.com` hostname returns 404. |
| `AZURE_TTS_VOICE` | no | Neural voice name (default: `en-US-JennyNeural`). |
| `CORS_ORIGINS` | no | Comma-separated list of allowed origins. Set to your frontend domain in production (e.g. `https://clarityai.yourdomain.com`). |
| `MAX_UPLOAD_MB` | no | Per-file upload ceiling (default: `10`). |
| `NEXT_PUBLIC_API_BASE_URL` | no | Leave empty to use the same-origin `/api/*` proxy (recommended for Coolify). |
| `BACKEND_INTERNAL_URL` | no | Internal URL the Next.js server uses to reach the backend (default: `http://backend:8000`). |
| `KEEP_ALIVE_TIMEOUT` | no | Node.js HTTP keep-alive timeout in **milliseconds** (default: `100000`). Must exceed Traefik's keep-alive (90 s) to prevent force-refresh 504s. |

### Run the full stack (Docker)

```bash
cp .env.example .env            # set NVIDIA_API_KEY (and optionally BRAVE_API_KEY, AZURE_TTS_KEY)
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

1. **New Resource** → **Docker Compose** → **Public Repository** → enter
   `https://github.com/falakme/clearaid`, branch `main`,
   compose file `/docker-compose.yml`.
2. **Domains** — set "Domains for frontend" to `https://yourdomain.com` (no
   port suffix). Leave "Domains for backend" empty — the backend is internal
   only and the frontend proxies to it.
3. **Environment Variables** — add at minimum:
   ```
   NVIDIA_API_KEY=nvapi-...
   CORS_ORIGINS=https://yourdomain.com
   BACKEND_INTERNAL_URL=http://backend:8000
   ```
   Optionally add `BRAVE_API_KEY`, `AZURE_TTS_KEY`, and
   `AZURE_TTS_ENDPOINT=https://<region>.tts.speech.microsoft.com/cognitiveservices/v1`.
4. **Auto Deploy** — enable in Configuration → Advanced so every push to
   `main` triggers a rebuild. With the GitHub App connected no manual webhook
   setup is needed.
5. **Deploy.** The backend image provisions `tesseract-ocr` for OCR and runs
   as a non-root user. The frontend container joins the `coolify` proxy network
   (declared in `docker-compose.yml`) so Traefik can route to it.

> **Note on Azure TTS endpoint:** The Azure portal shows a general
> `https://<region>.api.cognitive.microsoft.com/` endpoint. The TTS REST API
> lives at a different hostname: `https://<region>.tts.speech.microsoft.com/cognitiveservices/v1`.
> Using the portal's endpoint returns 404.

---

## 7. Security & Hardening

The following hardening measures are in place as of the current version:

| Area | Measure |
| ---- | ------- |
| **Rate limiting** | `slowapi` per-IP limits on all paid-upstream endpoints: `POST /api/translate-form` (20/min), `POST /api/recommend` (30/min), `POST /api/tts` (30/min). |
| **Upload bounds** | Max 5 files per request; per-file ceiling enforced (`MAX_UPLOAD_MB`, default 10 MB). |
| **OCR blocking** | `pytesseract` and `pypdf` run in a `ThreadPoolExecutor` via `run_in_threadpool` so CPU-bound work never blocks the async event loop. |
| **PII redaction** | SSNs, email addresses, and phone numbers are stripped from both typed context and extracted document text before anything is sent to the model. |
| **IP validation** | The `client_ip` header is validated as a public, globally-routable IP address (`ipaddress` module) before being used in geolocation — prevents path injection and private-address leaks. |
| **URL allowlisting** | Model-provided resource URLs are restricted to `http(s)` on both the backend (`parsing.py`) and frontend (`isSafeHttpUrl`) before being rendered as links — blocks `javascript:`, `data:`, and other dangerous schemes. |
| **Error hygiene** | Upstream provider error details (NVIDIA, Azure) are logged server-side only; clients receive a generic message. |
| **Security headers** | Next.js serves `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy` on all routes. |
| **CORS** | `allow_credentials=False`, methods scoped to `GET, POST, OPTIONS`, headers scoped to `Content-Type`. |
| **Non-root container** | The backend Dockerfile adds an `appuser` and drops to it before `EXPOSE`. |
| **Data purge** | "Erase my data" clears `localStorage`, `sessionStorage`, all Cache Storage caches, and unregisters the service worker — so cached document translations don't survive an explicit wipe. |
| **XSS** | `react-markdown` is used without `rehype-raw`, so model output cannot inject HTML. SSML text is XML-escaped in `azure_tts.py`. |


---

## 8. Changelog

### Session — 2026-06-19

#### Correctness
- **Extraction prompt/schema sync** — the system prompt previously only
  requested ~4 fields while the parser and UI expected ~10. Rebuilt to request
  the full documented schema (`plain_language_explanation_markdown`, `table_data`,
  `diagram_steps`, `document_category`, `ai_confidence_score`, etc.), so all
  dashboard tabs now populate correctly.
- **Agentic recommendation wired up** — the Resources tab was rendering the raw
  `local_support_resources` array instead of the AI-evaluated
  `recommended_resource_*` fields produced by `/api/recommend`. Fixed to show
  the verified resource name, link, and the model's one-line reasoning.
- **`blur_detected` scoped to uploads** — the blur error was firing for plain
  typed text, showing a "take another photo" message when no photo was uploaded.
  The prompt and backend now restrict `blur_detected` to OCR'd documents only.

#### Performance & Scalability
- **Threadpool OCR** — `pytesseract` and `pypdf` now run via `run_in_threadpool`
  so CPU-bound extraction never blocks the async event loop.
- **Upload cap** — requests are bounded to 5 files; size check happens before
  the file is processed.
- **No duplicate Brave search** — the autonomous research step was running on
  both the fast `/translate-form` path and the slow `/recommend` path. Brave is
  now queried exactly once, on `/recommend` only.
- **Language change debounce** — changing the output language on the dashboard
  fires one NVIDIA call per selection. Arrow-key browsing through the `<select>`
  was triggering a call per keypress, exhausting the rate limit. An 800 ms
  debounce collapses rapid changes into a single call.
- **Force-refresh 504 fix** — Node.js closes keep-alive connections after 5 s
  idle by default; Traefik's default is 90 s. The race caused 504s on hard
  refresh. `KEEP_ALIVE_TIMEOUT=100000` (ms) in the frontend environment ensures
  Node.js outlasts Traefik.

#### Security & Privacy (see §7 for full table)
- Per-IP rate limiting via `slowapi` on all three paid-upstream endpoints.
- IP address validated before geolocation (blocks path/URL injection).
- Model-provided URLs allowlisted to `http(s)` on both server and client.
- Upstream provider errors logged server-side only; generic messages to clients.
- CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy` headers added via `next.config.mjs`.
- CORS tightened: `allow_credentials=False`, scoped methods and headers.
- Backend container now runs as a non-root `appuser`.
- "Erase my data" now clears Cache Storage and unregisters the service worker
  in addition to `localStorage` (cached document translations were surviving).

#### Refactors
- `backend/app/services/nvidia.py` (473 lines) split into three focused modules:
  `prompts.py` (system prompts + per-domain hints), `parsing.py` (JSON repair,
  normalization, emoji stripping, URL validation), and a slim orchestrator.
- `geolocation.py` extracted as a standalone best-effort service with IP
  validation.
- `ratelimit.py` provides the shared `slowapi` limiter instance to avoid
  circular imports.
- `useSpeechRecognition` and `useAudioLevels` extracted from the 471-line
  `smart-input.tsx` into standalone hooks in `lib/`.

#### UX
- Language selector now displays each language's name in its own script:
  Español, Français, عربي, 中文, हिन्दी, Deutsch, Português, Tiếng Việt,
  Filipino, 한국어, اردو, বাংলা, Русский, Kreyòl. The API value remains the
  English name so the backend prompt contract is unchanged.
- Brand renamed from ClearAid → **ClarityAI** everywhere in source
  (`brand.tsx`, `package.json`, `package-lock.json`).

#### Deployment (Coolify)
- Frontend container joins the `coolify` external Docker network so Traefik can
  route to it; backend stays on the internal compose network only.
- `SERVICE_URL_BACKEND` removed from all Next.js proxy routes — Coolify injects
  this variable without a port number, causing 502s on every proxied call.
  Routes now use `BACKEND_INTERNAL_URL` (default: `http://backend:8000`).
- Azure TTS endpoint corrected from `api.cognitive.microsoft.com` to
  `tts.speech.microsoft.com` (the general domain returns 404 for TTS requests).
- Backend healthcheck added to `docker-compose.yml` using stdlib
  `urllib.request` (no extra dependencies).
- Frontend Dockerfile healthcheck removed — it used `wget --spider` which is a
  GNU-only flag not available in Alpine/busybox, causing the container to be
  permanently marked unhealthy and excluded from Traefik routing.
