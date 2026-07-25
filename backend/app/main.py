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
    # Which database are we actually using? (postgresql = persistent Neon,
    # sqlite = EPHEMERAL container file that is wiped on every redeploy)
    backend = settings.DATABASE_URL.split(":", 1)[0].split("+")[0]
    if backend.startswith("sqlite"):
        log.warning("=" * 60)
        log.warning("USING EPHEMERAL SQLite DATABASE — ALL USERS WILL BE LOST "
                    "ON EVERY REDEPLOY. Set the DATABASE_URL env var to your "
                    "Neon Postgres connection string.")
        log.warning("=" * 60)
    else:
        log.info("Using persistent database backend: %s", backend)

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
        # branded partner account (PDFs carry GROVY branding for this email)
        partner_email = "gncnanded@gmail.com"
        if not db.query(User).filter(User.email == partner_email).first():
            db.add(User(
                name="GROVY Education Consultant",
                email=partner_email,
                password_hash=hash_password("Pass@1234"),
                mobile="9921770747", city="Nanded", state="Maharashtra",
                role=Role.user, status=Status.approved, is_active=True))
            db.commit()
            log.info("Seeded branded partner account %s", partner_email)
        aspire_email = "aspirecareer1212@gmail.com"
        if not db.query(User).filter(User.email == aspire_email).first():
            db.add(User(
                name="ASPIRE Career Counselling Center",
                email=aspire_email,
                password_hash=hash_password("Aspire@1212"),
                mobile="9607801212", city="Latur", state="Maharashtra",
                role=Role.user, status=Status.approved, is_active=True))
            db.commit()
            log.info("Seeded branded partner account %s", aspire_email)
    finally:
        db.close()


@app.get("/api/health")
def health():
    backend = settings.DATABASE_URL.split(":", 1)[0].split("+")[0]
    info = {"status": "ok", "app": settings.APP_NAME, "database": backend,
            "persistent": not backend.startswith("sqlite")}
    try:
        db = SessionLocal()
        info["user_count"] = db.query(User).count()
        db.close()
    except Exception:
        pass
    return info


app.include_router(auth.router)
app.include_router(prediction.router)
app.include_router(history.router)
app.include_router(admin.router)
app.include_router(dataset.router)
