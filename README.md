# CareerNode

> **Precision matching. Zero friction.**

AI-powered Job Aggregation and Resume Tailoring Copilot for the Greater Toronto Area tech market. Automatically ingests live GTA job postings, semantically matches them against your resume, and generates ATS-beating cover letters and resume tweaks — powered by LangChain + Gemini.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI |
| AI | LangChain, Google Gemini API (Flash 1.5) |
| Database | PostgreSQL via Supabase + pgvector |
| Auth | Supabase Auth |
| Ingestion | JSearch API (RapidAPI) — every 6 hours |

---

## Monorepo Structure

```
CareerNode/
├── frontend/          # Next.js App Router client
├── backend/           # FastAPI + LangChain server
│   ├── app/
│   │   ├── auth/      # Supabase Auth wrappers
│   │   ├── jobs/      # Paginated job feed
│   │   ├── match/     # LangChain AI orchestration
│   │   └── ingestion/ # JSearch worker + APScheduler
│   ├── schema.sql     # Apply to Supabase SQL Editor
│   └── requirements.txt
└── README.md
```

---

## Setup

### 1. Database (Supabase)

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In **Dashboard → Database → Extensions**, enable the `vector` extension.
3. Open the **SQL Editor** and run `backend/schema.sql` in full.
4. Collect your keys from **Project Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill in your secrets
cp .env.example .env

# Start the server
uvicorn main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

**Required `.env` variables:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase Postgres connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (backend only) |
| `GOOGLE_API_KEY` | Gemini API key |
| `RAPIDAPI_KEY` | RapidAPI key for JSearch |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### 3. Frontend

```bash
cd frontend

# Copy and fill in your secrets
cp .env.local.example .env.local

npm install
npm run dev
# → http://localhost:3000
```

**Required `.env.local` variables:**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | FastAPI backend URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

---

## Running the Ingestion Worker Manually

```bash
cd backend
source .venv/bin/activate
python -m app.ingestion.worker           # live run
python -m app.ingestion.worker --dry-run # preview only, no DB writes
```

---

## API Reference

Full interactive docs at `http://localhost:8000/docs`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Server health check |
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, get access token |
| GET | `/api/jobs` | — | Paginated job feed |
| POST | `/api/match` | ✓ | AI match analysis for a job |
