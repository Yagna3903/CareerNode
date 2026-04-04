"""
Jobs router — paginated feed of ingested GTA tech postings.
Publicly accessible read endpoint; no auth required.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.models import Job
from app.schemas import JobsPage, JobResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=JobsPage)
async def list_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Return a paginated list of jobs, newest first."""
    offset = (page - 1) * page_size
    total = db.scalar(select(func.count()).select_from(Job))
    jobs = db.scalars(
        select(Job).order_by(Job.created_at.desc()).offset(offset).limit(page_size)
    ).all()
    return JobsPage(
        items=[JobResponse.model_validate(j) for j in jobs],
        total=total or 0,
        page=page,
        page_size=page_size,
    )
