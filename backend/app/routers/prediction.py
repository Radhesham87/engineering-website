"""Run engineering predictions and download the PDF."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_approved_user
from app.models import Prediction, Setting, User
from app.schemas import PredictIn, PredictOut
from app.services.pdf_generator import build_prediction_pdf
from app.services.prediction_engine import predict as run_predict

router = APIRouter(prefix="/api/prediction", tags=["prediction"])

_WIN_KEYS = ("pct_upper_buffer", "pct_lower_buffer",
             "rank_lower_buffer", "rank_upper_buffer")


def _window(db: Session) -> dict:
    out = {}
    for row in db.query(Setting).all():
        if row.key in _WIN_KEYS:
            try:
                out[row.key] = float(row.value)
            except ValueError:
                pass
    return out


@router.post("/predict", response_model=PredictOut)
def predict(body: PredictIn, db: Session = Depends(get_db),
            user: User = Depends(get_approved_user)):
    try:
        res = run_predict(body.exam, body.mode, body.value, body.category,
                          body.branches, body.districts,
                          quotas=body.quotas, gender=body.gender,
                          window=_window(db))
    except FileNotFoundError:
        raise HTTPException(503, "Prediction dataset is not available.")
    except ValueError as e:
        raise HTTPException(400, str(e))

    row = Prediction(
        user_id=user.id, student_name=body.student_name, exam=body.exam,
        mode=body.mode, value=body.value, category=body.category,
        branches=body.branches, districts=body.districts,
        result_count=res["count"], results=res["results"])
    db.add(row)
    db.commit()
    db.refresh(row)

    return PredictOut(
        student_name=body.student_name, exam=body.exam, mode=body.mode,
        value=body.value, category=body.category, branches=body.branches,
        districts=body.districts, show_category=res["show_category"],
        count=res["count"], results=res["results"], prediction_id=row.id)


@router.get("/{prediction_id}/pdf")
def download_pdf(prediction_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_approved_user)):
    q = db.query(Prediction).filter(Prediction.id == prediction_id)
    if user.role.value != "admin":
        q = q.filter(Prediction.user_id == user.id)
    pred = q.first()
    if not pred:
        raise HTTPException(404, "Prediction not found.")

    payload = {
        "student_name": pred.student_name, "exam": pred.exam,
        "mode": pred.mode, "value": pred.value, "category": pred.category,
        "branches": pred.branches or [], "districts": pred.districts or [],
        "show_category": pred.exam.upper() == "MH-CET",
        "count": pred.result_count, "results": pred.results or []}
    pdf = build_prediction_pdf(payload)

    dl = db.query(Setting).filter(Setting.key == "total_downloads").first()
    if not dl:
        dl = Setting(key="total_downloads", value="0")
        db.add(dl)
    dl.value = str(int(dl.value or 0) + 1)
    db.commit()

    import io
    name = f"Engineering_Prediction_{prediction_id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{name}"'})
