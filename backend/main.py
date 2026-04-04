"""
CareerNode FastAPI application entry-point.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.ingestion.scheduler import start_scheduler, stop_scheduler
from app.auth.router import router as auth_router
from app.jobs.router import router as jobs_router
from app.match.router import router as match_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()


app = FastAPI(
    title="CareerNode API",
    description="Job Aggregation and AI Resume Tailoring Copilot",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth_router,  prefix="/api")
app.include_router(jobs_router,  prefix="/api")
app.include_router(match_router, prefix="/api")


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
