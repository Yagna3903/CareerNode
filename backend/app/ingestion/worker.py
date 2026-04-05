"""
Ingestion worker — fetches GTA tech jobs from JSearch (RapidAPI),
generates Gemini embeddings, and upserts into the `jobs` table.
Run directly:  python -m app.ingestion.worker
Or scheduled via APScheduler (scheduler.py).
"""
import asyncio
import logging
import random
import sys
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime
from functools import partial

import httpx
from google import genai as google_genai
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.database import SessionLocal
from app.models import Job

log = logging.getLogger(__name__)

# google-genai client — confirmed to support gemini-embedding-001 on this key
_genai_client = google_genai.Client(api_key=settings.google_api_key)
_EMBED_MODEL = "models/gemini-embedding-001"  # MRL-trained; supports output_dimensionality truncation

JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"
GTA_QUERIES = [
    "software OR IT OR developer OR data OR AI (entry level OR internship OR junior) Greater Toronto Area"
]

# Thread pool for blocking Gemini embed calls (sdk is synchronous)
_executor = ThreadPoolExecutor(max_workers=4)


# ── Embedding ─────────────────────────────────────────────────────────────────

def _get_embedding_sync(text: str) -> list[float]:
    """Embed text using gemini-embedding-001, truncated to 768 dims via MRL."""
    from google.genai import types
    result = _genai_client.models.embed_content(
        model=_EMBED_MODEL,
        contents=text[:8000],
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    return result.embeddings[0].values


async def _get_embedding(text: str) -> list[float]:
    """Async wrapper — offloads the blocking embed call to a thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, partial(_get_embedding_sync, text))


# ── JSearch fetch with exponential backoff ────────────────────────────────────

async def _fetch_page(
    client: httpx.AsyncClient,
    query: str,
    page: int,
    max_retries: int = 4,
) -> list[dict]:
    """Fetch one page of JSearch results with retry on 429/503."""
    headers = {
        "X-RapidAPI-Key": settings.rapidapi_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }
    params = {
        "query": query,
        "num_pages": "1",
        "page": str(page),
        "date_posted": "today",
        "employment_types": "FULLTIME,PARTTIME,CONTRACTOR,INTERN",
        "country": "CA",
    }

    delay = 1.0
    for attempt in range(max_retries):
        try:
            resp = await client.get(JSEARCH_URL, headers=headers, params=params)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                log.info("  [JSearch] page=%d query='%s' → %d results", page, query, len(data))
                return data
            elif resp.status_code in (429, 503):
                wait = delay + random.uniform(0, delay * 0.3)
                log.warning(
                    "  [JSearch] %d on '%s' page %d — retrying in %.1fs (attempt %d/%d)",
                    resp.status_code, query, page, wait, attempt + 1, max_retries,
                )
                await asyncio.sleep(wait)
                delay *= 2
            elif resp.status_code == 403:
                log.error(
                    "  [JSearch] 403 Forbidden for '%s' — verify your RapidAPI key "
                    "and ensure JSearch is subscribed on your plan.",
                    query,
                )
                return []
            else:
                log.warning("  [JSearch] HTTP %d for '%s' page %d", resp.status_code, query, page)
                return []
        except httpx.RequestError as exc:
            log.warning("  [JSearch] Network error for '%s' page %d: %s", query, page, exc)
            await asyncio.sleep(delay)
            delay *= 2

    log.error("  [JSearch] Exhausted retries for '%s' page %d", query, page)
    return []


async def _fetch_jobs(query: str, num_pages: int = 1) -> list[dict]:
    """Fetch all pages for a query with a short inter-page delay."""
    all_jobs: list[dict] = []
    async with httpx.AsyncClient(timeout=30) as client:
        for page in range(1, num_pages + 1):
            jobs = await _fetch_page(client, query, page)
            all_jobs.extend(jobs)
            if page < num_pages:
                await asyncio.sleep(1.2)  # respect burst limits
    return all_jobs


# ── Job mapping ───────────────────────────────────────────────────────────────

def _map_job(raw: dict) -> dict:
    """Map a JSearch result dict to the jobs table schema."""
    posted_at = raw.get("job_posted_at_datetime_utc")
    posted_date: date | None = None
    if posted_at:
        try:
            posted_date = datetime.fromisoformat(posted_at.replace("Z", "+00:00")).date()
        except ValueError:
            pass

    url = raw.get("job_apply_link") or raw.get("job_google_link")
    title = raw.get("job_title", "Unknown Title")
    desc = raw.get("job_description", "")
    
    is_urgent = bool(re.search(r'\burgent\b|\bimmediate\b', f"{title} {desc}", re.IGNORECASE))
    is_actively = bool(re.search(r'\bactively recruiting\b', f"{title} {desc}", re.IGNORECASE))

    return {
        "title": title,
        "company": raw.get("employer_name"),
        "location": (
            raw.get("job_city")
            or raw.get("job_state")
            or raw.get("job_country")
            or "GTA"
        ),
        "description": desc,
        "posting_url": url,
        "date_posted": posted_date,
        "posted_at_datetime": raw.get("job_posted_at_datetime_utc"),
        "is_immediate_hire": is_urgent,
        "is_actively_recruiting": is_actively,
    }


# ── Main pipeline ─────────────────────────────────────────────────────────────

async def run_ingestion(dry_run: bool = False) -> int:
    """
    Full ingestion pipeline: fetch → deduplicate → embed → upsert.
    Returns count of jobs processed.
    """
    seen_urls: set[str] = set()
    all_mapped: list[dict] = []

    for i, query in enumerate(GTA_QUERIES):
        log.info("[%d/%d] Fetching: '%s'", i + 1, len(GTA_QUERIES), query)
        raw_jobs = await _fetch_jobs(query)

        embed_tasks: list = []
        valid_jobs: list[dict] = []
        for raw in raw_jobs:
            mapped = _map_job(raw)
            url = mapped.get("posting_url")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            valid_jobs.append(mapped)
            embed_tasks.append(_get_embedding(f"{mapped['title']} {mapped['description']}"))

        if embed_tasks:
            embeddings = await asyncio.gather(*embed_tasks, return_exceptions=True)
            for mapped, embedding in zip(valid_jobs, embeddings):
                if isinstance(embedding, Exception):
                    log.warning("Embedding failed for '%s': %s", mapped["title"], embedding)
                    mapped["vector_embedding"] = None
                else:
                    mapped["vector_embedding"] = embedding
                all_mapped.append(mapped)

        # Polite pause between queries
        if i < len(GTA_QUERIES) - 1:
            await asyncio.sleep(2.0)

    log.info("Total unique jobs: %d", len(all_mapped))

    if dry_run:
        log.info("[DRY RUN] Skipping DB write. Sample jobs:")
        for j in all_mapped[:5]:
            log.info("  • %s @ %s (%s)", j["title"], j["company"], j["location"])
        return len(all_mapped)

    if not all_mapped:
        log.warning("No jobs fetched — DB write skipped.")
        return 0

    # Use the supabase client for upsert to avoid DATABASE_URL parsing issues
    from supabase import create_client
    sb = create_client(settings.supabase_url, settings.supabase_service_role_key)

    # Prepare rows — convert date objects and None embeddings to JSON-serialisable types
    rows = []
    for job in all_mapped:
        row = dict(job)
        if row.get("date_posted") is not None:
            row["date_posted"] = row["date_posted"].isoformat()
        # Supabase REST API represents vectors as lists → already correct type
        rows.append(row)

    try:
        result = (
            sb.table("jobs")
            .upsert(rows, on_conflict="posting_url")
            .execute()
        )
        log.info("✅ Upserted %d jobs to the database.", len(rows))
    except Exception as exc:
        log.error("DB upsert failed: %s", exc)
        raise

    return len(rows)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )
    dry = "--dry-run" in sys.argv
    count = asyncio.run(run_ingestion(dry_run=dry))
    log.info("Done. Processed %d jobs.", count)
