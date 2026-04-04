-- ============================================================
-- CareerNode — PostgreSQL Schema
-- Apply via Supabase SQL Editor
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- PROFILES
-- Public mirror of auth.users — auto-populated by trigger.
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger function: create a profile row on every new Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger before recreating (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- USER_CONTEXT
-- Stores the user's master resume and education background.
-- ============================================================
CREATE TABLE IF NOT EXISTS user_context (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_resume_text   TEXT,
  education_background TEXT NOT NULL DEFAULT 'Advanced Diploma in Computer Systems Technology - Information Systems Engineering'
);

-- ============================================================
-- JOBS
-- Ingested from RapidAPI JSearch. Vector embedding from Gemini.
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  company          TEXT,
  location         TEXT,
  description      TEXT,
  posting_url      TEXT UNIQUE,
  date_posted      DATE,
  vector_embedding VECTOR(768),  -- gemini-embedding-001 truncated to 768 dims (MRL)
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- APPLICATIONS
-- Stores AI analysis results per user per job.
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id                 UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  ai_match_score         SMALLINT CHECK (ai_match_score BETWEEN 0 AND 100),
  generated_cover_letter TEXT,
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'applied', 'interviewing', 'rejected', 'offered')),
  created_at             TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, job_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs         ENABLE ROW LEVEL SECURITY;

-- Profiles: users access only their own row
DROP POLICY IF EXISTS "profiles: own row"   ON profiles;
CREATE POLICY "profiles: own row" ON profiles
  FOR ALL USING (id = auth.uid());

-- User context: users access only their own row
DROP POLICY IF EXISTS "user_context: own row" ON user_context;
CREATE POLICY "user_context: own row" ON user_context
  FOR ALL USING (user_id = auth.uid());

-- Applications: users access only their own rows
DROP POLICY IF EXISTS "applications: own rows" ON applications;
CREATE POLICY "applications: own rows" ON applications
  FOR ALL USING (user_id = auth.uid());

-- Jobs: public read; only the backend service-role key can write
DROP POLICY IF EXISTS "jobs: public read" ON jobs;
CREATE POLICY "jobs: public read" ON jobs
  FOR SELECT USING (true);

-- ============================================================
-- VECTOR SIMILARITY INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS jobs_vector_idx
  ON jobs USING ivfflat (vector_embedding vector_cosine_ops)
  WITH (lists = 100);
