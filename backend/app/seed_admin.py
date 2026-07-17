"""Manually (re)seed the admin account. Run: python -m app.seed_admin"""
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Role, Status, User
from app.security import hash_password


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if u:
            u.password_hash = hash_password(settings.ADMIN_PASSWORD)
            u.role, u.status, u.is_active = Role.admin, Status.approved, True
            print(f"Updated admin {settings.ADMIN_EMAIL}")
        else:
            db.add(User(name=settings.ADMIN_NAME, email=settings.ADMIN_EMAIL,
                        password_hash=hash_password(settings.ADMIN_PASSWORD),
                        role=Role.admin, status=Status.approved))
            print(f"Created admin {settings.ADMIN_EMAIL}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
