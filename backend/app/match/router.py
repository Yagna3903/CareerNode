"""
Match router — triggers LangChain / Gemini AI analysis for a given job.
Requires authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, UserContext, Application
from app.schemas import MatchRequest, ApplicationResponse
from app.auth.dependencies import get_current_user
from app.match.service import run_match

router = APIRouter(prefix="/match", tags=["match"])


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def match_job(
    body: MatchRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyse a job posting against the authenticated user's context.
    Returns an Application record containing the ATS score, cover letter,
    and resume tweaks.
    """
    user_id = current_user["id"]

    # Load job
    job = db.get(Job, body.job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    # Load user context
    ctx = db.query(UserContext).filter(UserContext.user_id == user_id).first()
    if ctx is None or not ctx.master_resume_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please upload your master resume in your profile before running a match.",
        )

    # Run AI chain
    result = await run_match(job=job, user_context=ctx)

    # Upsert application row
    existing = (
        db.query(Application)
        .filter(Application.user_id == user_id, Application.job_id == job.id)
        .first()
    )
    if existing:
        existing.ai_match_score = result.ats_score
        existing.generated_cover_letter = result.cover_letter
        db.commit()
        db.refresh(existing)
        return ApplicationResponse.model_validate(existing)

    app_row = Application(
        user_id=user_id,
        job_id=job.id,
        ai_match_score=result.ats_score,
        generated_cover_letter=result.cover_letter,
        status="pending",
    )
    db.add(app_row)
    db.commit()
    db.refresh(app_row)
    return ApplicationResponse.model_validate(app_row)
