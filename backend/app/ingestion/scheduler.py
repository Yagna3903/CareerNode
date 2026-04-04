"""
APScheduler configuration — runs the ingestion worker every 6 hours.
Started and stopped via FastAPI's lifespan context in main.py.
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.ingestion.worker import run_ingestion

log = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def start_scheduler() -> None:
    scheduler.add_job(
        run_ingestion,
        trigger=IntervalTrigger(hours=6),
        id="ingestion_job",
        name="GTA Job Ingestion",
        replace_existing=True,
        misfire_grace_time=300,  # tolerate up to 5 min late start
    )
    scheduler.start()
    log.info("Ingestion scheduler started — runs every 6 hours.")


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
    log.info("Ingestion scheduler stopped.")
