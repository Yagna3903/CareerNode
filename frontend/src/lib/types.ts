/**
 * TypeScript interfaces mirroring FastAPI Pydantic schemas.
 * Keep in sync with backend/app/schemas.py.
 */

export interface Job {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  posting_url: string | null;
  date_posted: string | null;
  created_at: string;
}

export interface JobsPage {
  items: Job[];
  total: number;
  page: number;
  page_size: number;
}

export interface ResumeTweak {
  bullet: string;
  rationale: string;
}

export interface MatchOutput {
  id: string;
  job_id: string;
  ai_match_score: number;
  ats_score: number;           // alias used by AIPanel
  generated_cover_letter: string | null;
  cover_letter: string;        // alias used by AIPanel (same value)
  status: string;
  created_at: string;
  resume_tweaks: ResumeTweak[];
}

export interface UserContext {
  id: string;
  user_id: string;
  master_resume_text: string | null;
  education_background: string;
}
