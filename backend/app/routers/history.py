"""User prediction history."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_approved_user
from app.models import Prediction, User

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
def my_history(db: Session = Depends(get_db),
               user: User = Depends(get_approved_user)):
    rows = (db.query(Prediction)
            .filter(Prediction.user_id == user.id)
            .order_by(Prediction.created_at.desc()).all())
    return [_row(p) for p in rows]


@router.delete("/{prediction_id}")
def delete(prediction_id: int, db: Session = Depends(get_db),
           user: User = Depends(get_approved_user)):
    p = (db.query(Prediction)
         .filter(Prediction.id == prediction_id,
                 Prediction.user_id == user.id).first())
    if not p:
        raise HTTPException(404, "Not found.")
    db.delete(p)
    db.commit()
    return {"deleted": prediction_id}


def _row(p: Prediction) -> dict:
    return {
        "id": p.id,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "student_name": p.student_name, "exam": p.exam, "mode": p.mode,
        "value": p.value, "category": p.category,
        "branches": p.branches or [], "districts": p.districts or [],
        "count": p.result_count}
