import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings
from app.database import init_db, sync_from_json

log = logging.getLogger("lotto-ai")


def refresh_thai() -> None:
    from app.scrapers import seed_data

    try:
        added = seed_data.update_thai()
        if added:
            sync_from_json("thai")
        log.info("Thai refresh: %d new draws", added)
    except Exception:  # keep the scheduler alive on network errors
        log.exception("Thai refresh failed")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    scheduler = None
    if settings.enable_scheduler:
        from apscheduler.schedulers.background import BackgroundScheduler

        scheduler = BackgroundScheduler(timezone="Asia/Bangkok")
        scheduler.add_job(refresh_thai, "cron", hour=17, minute=0)
        scheduler.start()
    yield
    if scheduler:
        scheduler.shutdown()


app = FastAPI(title="LottoAI API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
