"""SQLAlchemy engine, session factory, and Base."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# SQLite needs a special connect arg for multi-threaded FastAPI.
# Postgres gets a short connect_timeout so an unreachable/slow-to-wake DB
# (e.g. a suspended Neon instance) fails fast instead of hanging for minutes
# and blowing past Cloud Run's container-start timeout.
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    connect_args = {"connect_timeout": 10}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args,
                       pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
