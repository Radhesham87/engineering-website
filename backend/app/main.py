"""FastAPI application entry point."""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from sqlalchemy import text
from app.database import Base, SessionLocal, engine
from app.models import Role, Status, User
from app.routers import admin, auth, dataset, history, prediction
from app.security import hash_password

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("eng")

limiter = Limiter(key_func=get_remote_address, default_limits=["300/minute"])

app = FastAPI(title=settings.APP_NAME, version="1.0.0")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429,
                        content={"detail": "Too many requests. Slow down."})


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # lightweight migration: ensure the single-device session column exists
    try:
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                "session_id VARCHAR(64)"))
    except Exception as e:  # sqlite / already exists
        log.info("session_id migration skipped: %s", e)
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(
            User.email == settings.ADMIN_EMAIL).first()
        if not admin_user:
            db.add(User(
                name=settings.ADMIN_NAME, email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                role=Role.admin, status=Status.approved, is_active=True))
            db.commit()
            log.info("Seeded default admin %s", settings.ADMIN_EMAIL)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}


app.include_router(auth.router)
app.include_router(prediction.router)
app.include_router(history.router)
app.include_router(admin.router)
app.include_router(dataset.router)
