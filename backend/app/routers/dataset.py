"""Dataset management + prediction metadata."""
import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session  # noqa: F401

from app.config import settings
from app.schemas import CollegeListIn
from app.deps import get_admin, get_approved_user
from app.models import User
from app.services.prediction_engine import (college_list, dataset_stats,
                                            load_dataset, meta)

router = APIRouter(prefix="/api/dataset", tags=["dataset"])


def _path() -> str:
    p = settings.DATASET_PATH
    if not os.path.isabs(p):
        p = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), p)
    return p


@router.get("/meta")
def prediction_meta(_: User = Depends(get_approved_user)):
    """Exams, branches, categories, districts for building the predict UI."""
    try:
        return meta()
    except FileNotFoundError:
        raise HTTPException(404, "No dataset uploaded yet.")
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/stats")
def stats(_: User = Depends(get_admin)):
    try:
        return dataset_stats()
    except FileNotFoundError:
        raise HTTPException(404, "No dataset uploaded yet.")
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/summary")
def public_summary():
    """Public dataset counts for the landing page (no auth required)."""
    try:
        s = dataset_stats()
        return {
            "records": s["rows"],
            "institutes": s["colleges"],
            "branches": s["branches"],
            "districts": s["districts"],
        }
    except Exception:  # dataset missing / unreadable → safe zeros
        return {"records": 0, "institutes": 0, "branches": 0, "districts": 0}


@router.post("/colleges")
def colleges(body: CollegeListIn, _: User = Depends(get_approved_user)):
    """MH-CET college list filtered by category / quota / branch / district."""
    try:
        return college_list(body.exam, body.category, body.quotas,
                            body.branches, body.districts,
                            gender=body.gender)
    except FileNotFoundError:
        raise HTTPException(404, "No dataset uploaded yet.")
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/upload")
async def upload(file: UploadFile = File(...), _: User = Depends(get_admin)):
    if not file.filename.lower().endswith((".csv", ".gz", ".xlsx", ".xls")):
        raise HTTPException(400, "Accepted: .csv, .csv.gz, .xlsx, .xls")
    path = _path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(path, f"{path}.backup_{ts}")
    with open(path, "wb") as f:
        f.write(await file.read())
    try:
        load_dataset()
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(400, f"Uploaded file is invalid: {e}")
    return {"uploaded": file.filename, **dataset_stats()}


@router.get("/backup")
def backup(_: User = Depends(get_admin)):
    path = _path()
    if not os.path.exists(path):
        raise HTTPException(404, "No dataset to back up.")
    import io
    with open(path, "rb") as f:
        data = f.read()
    name = f"engineering_dataset_backup_{datetime.now():%Y%m%d_%H%M%S}" \
           + os.path.splitext(path)[1]
    return StreamingResponse(
        io.BytesIO(data), media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{name}"'})
