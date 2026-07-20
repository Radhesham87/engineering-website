"""Admin dashboard: stats, user management, prediction window, exports."""
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_admin
from app.models import Prediction, Role, Setting, Status, User
from app.schemas import StatsOut, UserOut, WindowIn
from app.security import hash_password
from app.services.excel_export import (predictions_xlsx,
                                       registered_users_xlsx)

router = APIRouter(prefix="/api/admin", tags=["admin"])

_XLSX = ("application/vnd.openxmlformats-officedocument."
         "spreadsheetml.sheet")


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db), _: User = Depends(get_admin)):
    today = datetime.now(timezone.utc).date()
    todays = sum(1 for p in db.query(Prediction).all()
                 if p.created_at and p.created_at.date() == today)
    dl = db.query(Setting).filter(Setting.key == "total_downloads").first()
    by_today: dict[str, int] = {}
    by_total: dict[str, int] = {}
    for p in db.query(Prediction).all():
        ex = p.exam or "MH-CET"
        by_total[ex] = by_total.get(ex, 0) + 1
        if p.created_at and p.created_at.date() == today:
            by_today[ex] = by_today.get(ex, 0) + 1
    return StatsOut(
        total_users=db.query(User).filter(User.role == Role.user).count(),
        pending_users=db.query(User).filter(
            User.status == Status.pending).count(),
        approved_users=db.query(User).filter(
            User.status == Status.approved).count(),
        rejected_users=db.query(User).filter(
            User.status == Status.rejected).count(),
        total_predictions=db.query(Prediction).count(),
        todays_predictions=todays,
        total_downloads=int(dl.value) if dl and dl.value else 0,
        by_exam_today=by_today, by_exam_total=by_total)


@router.get("/users", response_model=list[UserOut])
def users(status: str | None = None, q: str | None = None,
          db: Session = Depends(get_db), _: User = Depends(get_admin)):
    query = db.query(User).filter(User.role == Role.user)
    if status in ("pending", "approved", "rejected"):
        query = query.filter(User.status == Status(status))
    if q:
        like = f"%{q}%"
        query = query.filter((User.name.ilike(like)) |
                             (User.email.ilike(like)))
    out = []
    for u in query.order_by(User.created_at.desc()).all():
        d = UserOut.model_validate(u)
        d.prediction_count = len(u.predictions)
        d.session_active = bool(u.session_id)
        out.append(d)
    return out


def _get_user(uid: int, db: Session) -> User:
    u = db.query(User).filter(User.id == uid,
                              User.role == Role.user).first()
    if not u:
        raise HTTPException(404, "User not found.")
    return u


@router.post("/users/{uid}/approve")
def approve(uid: int, db: Session = Depends(get_db),
            _: User = Depends(get_admin)):
    u = _get_user(uid, db)
    u.status = Status.approved
    db.commit()
    return {"id": uid, "status": "approved"}


@router.post("/users/{uid}/reject")
def reject(uid: int, db: Session = Depends(get_db),
           _: User = Depends(get_admin)):
    u = _get_user(uid, db)
    u.status = Status.rejected
    db.commit()
    return {"id": uid, "status": "rejected"}


@router.post("/users/{uid}/disable")
def disable(uid: int, db: Session = Depends(get_db),
            _: User = Depends(get_admin)):
    u = _get_user(uid, db)
    u.is_active = False
    db.commit()
    return {"id": uid, "is_active": False}


@router.post("/users/{uid}/enable")
def enable(uid: int, db: Session = Depends(get_db),
           _: User = Depends(get_admin)):
    u = _get_user(uid, db)
    u.is_active = True
    db.commit()
    return {"id": uid, "is_active": True}


@router.post("/users/{uid}/reset-password")
def reset_password(uid: int, new_password: str,
                   db: Session = Depends(get_db),
                   _: User = Depends(get_admin)):
    if len(new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")
    u = _get_user(uid, db)
    u.password_hash = hash_password(new_password)
    db.commit()
    return {"id": uid, "reset": True}


@router.delete("/users/{uid}")
def delete_user(uid: int, db: Session = Depends(get_db),
                _: User = Depends(get_admin)):
    u = _get_user(uid, db)
    db.delete(u)
    db.commit()
    return {"deleted": uid}


@router.post("/users/{uid}/logout")
def force_logout(uid: int, db: Session = Depends(get_db),
                 _: User = Depends(get_admin)):
    """Clear the user's active session so their device is signed out."""
    u = _get_user(uid, db)
    u.session_id = None
    db.commit()
    return {"id": uid, "logged_out": True}


# ---------- prediction window ----------
@router.get("/window", response_model=WindowIn)
def get_window(db: Session = Depends(get_db), _: User = Depends(get_admin)):
    from app.config import settings
    d = {s.key: s.value for s in db.query(Setting).all()}
    return WindowIn(
        pct_upper_buffer=float(d.get("pct_upper_buffer",
                                     settings.PCT_UPPER_BUFFER)),
        pct_lower_buffer=float(d.get("pct_lower_buffer",
                                     settings.PCT_LOWER_BUFFER)),
        rank_lower_buffer=int(float(d.get("rank_lower_buffer",
                                          settings.RANK_LOWER_BUFFER))),
        rank_upper_buffer=int(float(d.get("rank_upper_buffer",
                                          settings.RANK_UPPER_BUFFER))),
        priority_institutes=d.get("priority_institutes",
                                  settings.PRIORITY_INSTITUTES))


@router.put("/window", response_model=WindowIn)
def set_window(body: WindowIn, db: Session = Depends(get_db),
               _: User = Depends(get_admin)):
    for key, val in body.model_dump().items():
        row = db.query(Setting).filter(Setting.key == key).first()
        if not row:
            row = Setting(key=key)
            db.add(row)
        row.value = str(val)
    db.commit()
    return body


# ---------- predictions + exports ----------
@router.get("/predictions")
def all_predictions(q: str | None = None, db: Session = Depends(get_db),
                    _: User = Depends(get_admin)):
    query = db.query(Prediction).order_by(Prediction.created_at.desc())
    rows = []
    for p in query.all():
        if q and q.lower() not in (p.student_name or "").lower() and \
                q.lower() not in ((p.user.email if p.user else "").lower()):
            continue
        rows.append({
            "id": p.id, "user": p.user.email if p.user else "",
            "student_name": p.student_name, "exam": p.exam, "mode": p.mode,
            "value": p.value, "category": p.category,
            "branches": p.branches or [], "districts": p.districts or [],
            "count": p.result_count,
            "created_at": p.created_at.isoformat() if p.created_at else None})
    return rows


@router.get("/export/users")
def export_users(db: Session = Depends(get_db),
                 _: User = Depends(get_admin)):
    users_all = db.query(User).filter(User.role == Role.user).all()
    data = registered_users_xlsx(users_all)
    return StreamingResponse(
        io.BytesIO(data), media_type=_XLSX,
        headers={"Content-Disposition":
                 'attachment; filename="Registered_Users.xlsx"'})


@router.get("/export/predictions")
def export_predictions(db: Session = Depends(get_db),
                       _: User = Depends(get_admin)):
    preds = db.query(Prediction).order_by(Prediction.created_at.desc()).all()
    data = predictions_xlsx(preds)
    return StreamingResponse(
        io.BytesIO(data), media_type=_XLSX,
        headers={"Content-Disposition":
                 'attachment; filename="Predictions.xlsx"'})
