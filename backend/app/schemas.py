"""
Pydantic schemas — request/response models for the CareerNode API.
These are the TypeScript interface mirrors: frontend/src/lib/types.ts must
be kept in sync with every schema defined here.
"""
import uuid
from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── User Context ──────────────────────────────────────────────────────────────

class UserContextCreate(BaseModel):
    master_resume_text: str
    education_background: Optional[str] = None


class UserContextResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    master_resume_text: Optional[str]
    education_background: str

    model_config = {"from_attributes": True}


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobResponse(BaseModel):
    id: uuid.UUID
    title: str
    company: Optional[str]
    location: Optional[str]
    description: Optional[str]
    posting_url: Optional[str]
    date_posted: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


class JobsPage(BaseModel):
    items: list[JobResponse]
    total: int
    page: int
    page_size: int


# ── Match / AI Output ─────────────────────────────────────────────────────────

class MatchRequest(BaseModel):
    job_id: uuid.UUID


class ResumeTweak(BaseModel):
    bullet: str
    rationale: str


class MatchResult(BaseModel):
    ats_score: int                     # 0-100
    cover_letter: str
    resume_tweaks: list[ResumeTweak]   # exactly 3


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    ai_match_score: Optional[int]
    generated_cover_letter: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
