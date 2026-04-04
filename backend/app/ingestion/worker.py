"""
Ingestion worker — fetches GTA tech jobs from JSearch (RapidAPI),
generates Gemini embeddings, and upserts into the `jobs` table.
Run directly:  python -m app.ingestion.worker
Or scheduled via APScheduler (scheduler.py).
"""
import asyncio
import logging
import sys
from datetime import date

import httpx
from google.generativeai import embed_content
import google.generativeai as genai
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.database import SessionLocal
from app.models import Job

log = logging.getLogger(__name__)

JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"
JSEARCH_HEADERS = {
    "X-RapidAPI-Key": settings.rapidapi_key,
    "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
}
GTA_QUERIES = [
    "software engineer Toronto",
    "backend developer Toronto",
    "full stack developer Toronto",
    "systems engineer Greater Toronto Area",
    "software developer Mississauga Brampton Markham",
]


def _get_embedding(text: str) -> list[float]:
    """Generate a 768-dim embedding via Gemini text-embedding-004."""
    genai.configure(api_key=settings.google_api_key)
    result = embed_content(
        model="models/text-embedding-004",
        content=text[:8000],  # truncate to avoid token limit
        task_type="RETRIEVAL_DOCUMENT",
    )
    return result["embedding"]


async def _fetch_jobs(query: str, num_pages: int = 2) -> list[dict]:
    """Call JSearch API and return a flat list of job results."""
    all_jobs: list[dict] = []
    async with httpx.AsyncClient(timeout=20) as client:
        for page in range(1, num_pages + 1):
            params = {
                "query": query,
                "num_pages": str(page),
                "page": str(page),
                "date_posted": "week",
                "job_requirements": "no_experience,under_3_years_experience,more_than_3_years_experience",
                "employment_types": "FULLTIME,PARTTIME,CONTRACTOR",
                "job_city": "Toronto",
                "country": "CA",
            }
            resp = await client.get(JSEARCH_URL, headers=JSEARCH_HEADERS, params=params)
            if resp.status_code != 200:
                log.warning("JSearch returned %s for query '%s'", resp.status_code, query)
                continue
            data = resp.json().get("data", [])
            all_jobs.extend(data)
    return all_jobs


def _map_job(raw: dict) -> dict:
    """Map a JSearch result dict to our Job schema."""
    posted_at = raw.get("job_posted_at_datetime_utc")
    posted_date: date | None = None
    if posted_at:
        try:
            from datetime import datetime
            posted_date = datetime.fromisoformat(posted_at.replace("Z", "+00:00")).date()
        except ValueError:
            pass

    description = raw.get("job_description", "")
    return {
        "title": raw.get("job_title", "Unknown Title"),
        "company": raw.get("employer_name"),
        "location": raw.get("job_city") or raw.get("job_state") or "GTA",
        "description": description,
        "posting_url": raw.get("job_apply_link") or raw.get("job_google_link"),
        "date_posted": posted_date,
    }


async def run_ingestion(dry_run: bool = False) -> int:
    """
    Full ingestion pipeline.
    Returns count of new / updated rows upserted.
    """
    seen_urls: set[str] = set()
    all_mapped: list[dict] = []

    for query in GTA_QUERIES:
        log.info("Fetching jobs for: %s", query)
        raw_jobs = await _fetch_jobs(query)
        for raw in raw_jobs:
            mapped = _map_job(raw)
            url = mapped.get("posting_url")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)

            # Generate embedding
            try:
                mapped["vector_embedding"] = _get_embedding(
                    f"{mapped['title']} {mapped['description']}"
                )
            except Exception as e:
                log.warning("Embedding failed for %s: %s", mapped["title"], e)
                mapped["vector_embedding"] = None

            all_mapped.append(mapped)

    log.info("Total unique jobs to upsert: %d", len(all_mapped))

    if dry_run:
        log.info("[DRY RUN] Skipping DB write.")
        return len(all_mapped)

    db = SessionLocal()
    try:
        stmt = (
            pg_insert(Job)
            .values(all_mapped)
            .on_conflict_do_update(
                index_elements=["posting_url"],
                set_={
                    "title": pg_insert(Job).excluded.title,
                    "description": pg_insert(Job).excluded.description,
                    "vector_embedding": pg_insert(Job).excluded.vector_embedding,
                },
            )
        )
        db.execute(stmt)
        db.commit()
    finally:
        db.close()

    return len(all_mapped)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    dry = "--dry-run" in sys.argv
    count = asyncio.run(run_ingestion(dry_run=dry))
    log.info("Done. Processed %d jobs.", count)
