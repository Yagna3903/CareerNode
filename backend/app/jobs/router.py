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
    sort_by: str = Query(default="newest"),
):
    """Return a paginated list of jobs. Sorting happens at the DB level before pagination."""
    offset = (page - 1) * page_size
    end = offset + page_size - 1

    query = (
        _sb()
        .table("jobs")
        .select(
            "id, title, company, location, description, posting_url, date_posted, "
            "posted_at_datetime, is_immediate_hire, is_actively_recruiting, created_at",
            count="exact",
        )
    )

    # Level filtering
    if level:
        level_lower = level.lower()
        if "intern" in level_lower:
            # Internship mode: STRICTLY matches title interns/co-op
            query = query.or_("title.ilike.%intern%,title.ilike.%co-op%,title.ilike.%internship%")
        elif "entry" in level_lower or "junior" in level_lower:
            # Entry mode: STRICTLY matches title junior/entry/associate/grad
            query = query.or_(
                "title.ilike.%junior%,title.ilike.%entry%,title.ilike.%associate%,title.ilike.%graduate%,title.ilike.%new grad%"
            )
            
        # Strongly exclude standard senior/mid-level identifiers across BOTH levels
        # (Since we just ran a massive broad net indexing "software developer")
        senior_keywords = [
            "senior", "sr.", "staff", "principal", "manager", "director", "lead", 
            "architect", "head of", "president", "vp", 
            " 3+", " 4+", " 5+", " 6+", " 7+", " 8+", " 10+",
            "mid", "expert", " ii", " iii", "- 2", "- 3", "level 2", "level-2", "level 3", "level-3"
        ]
        for word in senior_keywords:
            query = query.not_.ilike("title", f"%{word}%")

    # DB-level sort — applied BEFORE .range() so pagination is correct across all pages
    if sort_by == "newest":
        query = query.order("posted_at_datetime", desc=True).order("created_at", desc=True)
    else:
        # Fallback to newest — relevance sorting happens client-side after AI match
        query = query.order("posted_at_datetime", desc=True).order("created_at", desc=True)

    resp = query.range(offset, end).execute()

    return {
        "items": resp.data or [],
        "total": resp.count or 0,
        "page": page,
        "page_size": page_size,
    }
