"""Auth dependencies: current user / admin / approved user."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Role, Status, User
from app.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login-form",
                                     auto_error=False)


def get_current_user(token: str | None = Depends(oauth2_scheme),
                     db: Session = Depends(get_db)) -> User:
    cred_exc = HTTPException(status.HTTP_401_UNAUTHORIZED,
                             "Not authenticated",
                             {"WWW-Authenticate": "Bearer"})
    if not token:
        raise cred_exc
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise cred_exc
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user or not user.is_active:
        raise cred_exc
    # single-device login: token's session id must match the user's current one
    if user.session_id and payload.get("sid") != user.session_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            "Signed in on another device.",
                            {"WWW-Authenticate": "Bearer"})
    return user


def get_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != Role.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


def get_approved_user(user: User = Depends(get_current_user)) -> User:
    if user.role == Role.admin:
        return user
    if user.status != Status.approved:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Your account is awaiting admin approval.")
    return user
