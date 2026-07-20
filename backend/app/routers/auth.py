"""Registration and login."""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Role, Status, User
from app.schemas import LoginIn, RegisterIn, TokenOut, UserOut
from app.security import (create_access_token, hash_password,
                          verify_password)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut,
             status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if body.password != body.confirm_password:
        raise HTTPException(400, "Passwords do not match.")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(409, "Email already registered.")
    user = User(
        name=body.name, email=str(body.email), mobile=body.mobile,
        city=body.city, state=body.state,
        password_hash=hash_password(body.password),
        role=Role.user, status=Status.pending)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_out(user)


def _do_login(email: str, password: str, db: Session) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid email or password.")
    if not user.is_active:
        raise HTTPException(403, "Account disabled. Contact the admin.")
    if user.role != Role.admin and user.status == Status.rejected:
        raise HTTPException(403, "Your registration was rejected.")
    if user.role != Role.admin and user.status == Status.pending:
        raise HTTPException(403, "Your account is awaiting admin approval.")
    user.last_login = datetime.now(timezone.utc)
    user.session_id = uuid4().hex   # invalidates any previous device
    db.commit()
    return user


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = _do_login(str(body.email), body.password, db)
    token = create_access_token(user.email, user.role.value, user.session_id)
    return TokenOut(access_token=token, role=user.role.value,
                    name=user.name, status=user.status.value)


@router.post("/login-form", response_model=TokenOut, include_in_schema=False)
def login_form(form: OAuth2PasswordRequestForm = Depends(),
               db: Session = Depends(get_db)):
    """OAuth2 form login so Swagger 'Authorize' works."""
    user = _do_login(form.username, form.password, db)
    token = create_access_token(user.email, user.role.value, user.session_id)
    return TokenOut(access_token=token, role=user.role.value,
                    name=user.name, status=user.status.value)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return _user_out(user)


def _user_out(u: User) -> UserOut:
    data = UserOut.model_validate(u)
    data.prediction_count = len(u.predictions)
    return data
