"""
Match router — triggers LangChain / Gemini AI analysis for a given job.
Requires authentication.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client

from app.config import settings
from app.schemas import MatchRequest, ApplicationResponse, MatchResult
from app.auth.dependencies import get_current_user
from app.match.service import run_match

router = APIRouter(prefix="/match", tags=["match"])


def _sb():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@router.post("", status_code=status.HTTP_201_CREATED)
async def match_job(
    body: MatchRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Analyse a job posting against the authenticated user's context.
    Returns the ATS score, cover letter, resume tweaks, and saves to applications table.
    """
    sb = _sb()
    user_id = current_user["id"]

    # Load job (exclude heavy vector column)
    job_resp = (
        sb.table("jobs")
        .select("id, title, company, location, description, posting_url, date_posted")
        .eq("id", str(body.job_id))
        .single()
        .execute()
    )
    if not job_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    job = job_resp.data

    # Load user context
    ctx_resp = (
        sb.table("user_context")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not ctx_resp.data or not ctx_resp.data.get("master_resume_text"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile and upload a resume first.",
        )
    ctx = ctx_resp.data

    # Run AI chain (LangChain + Gemini)
    result: MatchResult = await run_match(job=job, user_context=ctx)

    # Upsert application row
    app_payload = {
        "user_id": user_id,
        "job_id": str(body.job_id),
        "ai_match_score": result.ats_score,
        "generated_cover_letter": result.cover_letter,
        "status": "pending",
    }
    app_resp = (
        sb.table("applications")
        .upsert(app_payload, on_conflict="user_id,job_id")
        .execute()
    )
    if not app_resp.data:
        raise HTTPException(status_code=500, detail="Failed to save application.")

    saved = app_resp.data[0]
    return {
        **saved,
        "resume_tweaks": [t.model_dump() for t in result.resume_tweaks],
    }
