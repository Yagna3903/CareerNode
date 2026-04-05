"""
Jobs router — paginated feed of ingested GTA tech postings.
Publicly accessible read endpoint; no auth required.
"""
from fastapi import APIRouter, Query
from supabase import create_client

from app.config import settings

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _sb():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@router.get("")
async def list_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    level: str | None = Query(default=None),
):
    """Return a paginated list of jobs, newest first. Optionally filter by level."""
    offset = (page - 1) * page_size
    end = offset + page_size - 1

    query = (
        _sb()
        .table("jobs")
        .select("id, title, company, location, description, posting_url, date_posted, created_at", count="exact")
    )
    
    if level:
        level_lower = level.lower()
        if "intern" in level_lower:
            query = query.or_("title.ilike.%intern%,description.ilike.%intern%")
        elif "entry" in level_lower or "junior" in level_lower:
            query = query.or_("title.ilike.%junior%,title.ilike.%entry%")
        elif "senior" in level_lower or "lead" in level_lower:
            query = query.or_("title.ilike.%senior%,title.ilike.%lead%,title.ilike.%principal%,title.ilike.%staff%")

    resp = query.order("created_at", desc=True).range(offset, end).execute()

    return {
        "items": resp.data or [],
        "total": resp.count or 0,
        "page": page,
        "page_size": page_size,
    }
