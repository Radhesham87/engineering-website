"""Engineering college prediction engine (MH-CET & JEE-Main).

Reads a unified cutoff dataset with columns:
    exam, college_code, college_name, district, branch, category,
    status, cutoff_percentile, cutoff_rank
"""
import os
import threading

import numpy as np
import pandas as pd

from app.config import settings

_LOCK = threading.Lock()
_CACHE: dict = {"path": None, "mtime": None, "df": None}
_REQUIRED = ["exam", "college_name", "branch", "cutoff_percentile"]


def _resolve(path: str) -> str:
    if not os.path.isabs(path):
        path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(__file__))), path)
    return path


def load_dataset() -> pd.DataFrame:
    path = _resolve(settings.DATASET_PATH)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset not found at {path}")
    mtime = os.path.getmtime(path)
    with _LOCK:
        if _CACHE["path"] == path and _CACHE["mtime"] == mtime:
            return _CACHE["df"]

        if path.endswith((".csv", ".gz")):
            df = pd.read_csv(path)
        else:
            df = pd.read_excel(path, sheet_name=0)
        df.columns = [str(c).strip().lower().replace(" ", "_")
                      for c in df.columns]
        missing = [c for c in _REQUIRED if c not in df.columns]
        if missing:
            raise ValueError(f"Dataset missing columns: {missing}")

        for c in ["exam", "college_code", "college_name", "district",
                  "branch", "category", "status"]:
            if c in df.columns:
                df[c] = (df[c].fillna("").astype("object")
                         .astype(str).str.strip())
                df.loc[df[c].isin(["nan", "None", "<NA>"]), c] = ""
            else:
                df[c] = ""
        for c in ["cutoff_percentile", "cutoff_rank"]:
            df[c] = pd.to_numeric(df[c], errors="coerce") if c in df else np.nan

        df["exam_u"] = df["exam"].str.upper()
        df["branch_u"] = df["branch"].str.upper()
        df["category_u"] = df["category"].str.upper()
        df["district_u"] = df["district"].str.upper()
        df["status_u"] = df["status"].str.upper()

        _CACHE.update({"path": path, "mtime": mtime, "df": df})
        return df


# MH-CET category codes shown in the Category box (prefix-less). The Gender /
# Seat Type control supplies the G (gender-neutral) / L (ladies) prefix, so
# e.g. Gender-Neutral + OPEN -> GOPEN*, Female + OPEN -> LOPEN*, Any -> both.
MHTCET_CATEGORIES = [
    "OPEN", "OBC", "SEBC", "EWS", "NT1", "NT2", "NT3", "SC", "ST", "VJ",
    "TFWS", "DEFROBC", "DEFROPEN", "DEFRSEBC", "DEFRNT1", "DEFRNT2",
    "DEFRNT3", "DEFRSC", "DEFRST", "DEFRVJ",
]
# only these have gender (G) / ladies (L) prefixed variants in the dataset
_GL_CATEGORIES = {"OPEN", "OBC", "SEBC", "NT1", "NT2", "NT3", "SC", "ST", "VJ"}
# display codes that don't literally prefix the dataset code
_CAT_PREFIX = {"DEFROPEN": "DEFOPEN"}


def _category_prefixes(category: str, gender: str) -> list[str]:
    """Dataset category prefixes for a selected category + gender/seat type."""
    cat = category.upper()
    if cat in _GL_CATEGORIES:
        g = (gender or "gender-neutral").lower()
        if g in ("ladies", "female"):
            return ["L" + cat]
        if g == "any":
            return ["G" + cat, "L" + cat]
        return ["G" + cat]                      # gender-neutral (default)
    return [_CAT_PREFIX.get(cat, cat)]          # EWS / TFWS / DEF*: no gender


def meta() -> dict:
    df = load_dataset()
    out = {"exams": sorted(e for e in df["exam"].unique() if e), "by_exam": {}}
    for exam in out["exams"]:
        sub = df[df["exam"] == exam]
        out["by_exam"][exam] = {
            "branches": sorted(b for b in sub["branch"].unique() if b),
            "categories": (MHTCET_CATEGORIES if exam.upper() == "MH-CET"
                           else sorted(c for c in sub["category"].unique() if c)),
            "districts": sorted(d for d in sub["district"].unique() if d),
            "quotas": sorted(s for s in sub["status"].unique() if s),
        }
    return out


def dataset_stats() -> dict:
    df = load_dataset()
    return {
        "rows": int(len(df)),
        "colleges": int(df["college_name"].nunique()),
        "branches": int(df["branch"].nunique()),
        "districts": int(df["district"].replace("", np.nan).nunique()),
        "by_exam": {e: int((df["exam"] == e).sum())
                    for e in df["exam"].unique() if e},
    }


def _pct_from_rank(sub: pd.DataFrame, rank: float):
    pairs = sub[["cutoff_percentile", "cutoff_rank"]].dropna()
    if pairs.empty:
        return None
    nearest = pairs.iloc[(pairs["cutoff_rank"] - rank).abs().argsort()[:15]]
    return float(nearest["cutoff_percentile"].median())


def predict(exam: str, mode: str, value: float, category: str,
            branches: list[str], districts: list[str],
            quotas: list[str] | None = None,
            gender: str = "gender-neutral",
            window: dict | None = None) -> dict:
    df = load_dataset()
    w = window or {}
    pct_up = float(w.get("pct_upper_buffer", settings.PCT_UPPER_BUFFER))
    rank_lo = int(w.get("rank_lower_buffer", settings.RANK_LOWER_BUFFER))
    rank_up = int(w.get("rank_upper_buffer", settings.RANK_UPPER_BUFFER))
    pct_lo = float(w.get("pct_lower_buffer", settings.PCT_LOWER_BUFFER))

    d = df[df["exam_u"] == exam.upper()]

    show_category = exam.upper() == "MH-CET"
    if show_category and category:
        prefs = tuple(_category_prefixes(category, gender))
        d = d[d["category_u"].str.startswith(prefs)]

    brs = [b for b in (branches or []) if b]
    if brs:
        d = d[d["branch_u"].isin([b.upper() for b in brs])]
    dsts = [x for x in (districts or []) if x]
    if dsts:
        d = d[d["district_u"].isin([x.upper() for x in dsts])]
    qtas = [q for q in (quotas or []) if q]
    if qtas:
        d = d[d["status_u"].isin([q.upper() for q in qtas])]

    if mode == "rank":
        percentile = _pct_from_rank(d if not d.empty else df, value)
        percentile = 0.0 if percentile is None else percentile
    else:
        percentile = float(value)

    d = d[d["cutoff_percentile"].notna()].copy()
    if exam.upper() == "JEE-MAIN" and mode == "rank":
        d = d[d["cutoff_rank"].between(value - rank_lo, value + rank_up)]
    else:
        d = d[(d["cutoff_percentile"] <= percentile + pct_up) &
              (d["cutoff_percentile"] >= percentile - pct_lo)]

    d = d.sort_values(["cutoff_percentile", "cutoff_rank"],
                      ascending=[False, True], na_position="last")

    rows = []
    for i, (_, r) in enumerate(d.iterrows(), 1):
        rows.append({
            "sr_no": i,
            "college_code": str(r["college_code"]),
            "college_name": str(r["college_name"]),
            "district": str(r["district"]) or "-",
            "branch": str(r["branch"]),
            "category": str(r["category"]) if show_category else "-",
            "status": str(r["status"]) or "-",
            "cutoff_percentile": (round(float(r["cutoff_percentile"]), 4)
                                  if pd.notna(r["cutoff_percentile"]) else None),
            "cutoff_rank": (int(r["cutoff_rank"])
                            if pd.notna(r["cutoff_rank"]) else None),
        })
    return {"show_category": show_category, "count": len(rows),
            "results": rows}


def college_list(exam: str, category: str = "", quotas=None,
                 branches=None, districts=None, limit: int = 2000,
                 gender: str = "gender-neutral") -> dict:
    """List MH-CET colleges (with cutoffs) matching filters — no score needed."""
    df = load_dataset()
    d = df[df["exam_u"] == exam.upper()]
    show_category = exam.upper() == "MH-CET"
    if show_category and category:
        prefs = tuple(_category_prefixes(category, gender))
        d = d[d["category_u"].str.startswith(prefs)]
    brs = [b for b in (branches or []) if b]
    if brs:
        d = d[d["branch_u"].isin([b.upper() for b in brs])]
    dsts = [x for x in (districts or []) if x]
    if dsts:
        d = d[d["district_u"].isin([x.upper() for x in dsts])]
    qtas = [q for q in (quotas or []) if q]
    if qtas:
        d = d[d["status_u"].isin([q.upper() for q in qtas])]

    d = d[d["cutoff_percentile"].notna()].copy()
    d = d.sort_values(["cutoff_percentile", "cutoff_rank"],
                      ascending=[False, True], na_position="last").head(limit)

    rows = []
    for i, (_, r) in enumerate(d.iterrows(), 1):
        rows.append({
            "sr_no": i,
            "college_code": str(r["college_code"]),
            "college_name": str(r["college_name"]),
            "district": str(r["district"]) or "-",
            "branch": str(r["branch"]),
            "category": str(r["category"]) if show_category else "-",
            "status": str(r["status"]) or "-",
            "cutoff_percentile": (round(float(r["cutoff_percentile"]), 4)
                                  if pd.notna(r["cutoff_percentile"]) else None),
            "cutoff_rank": (int(r["cutoff_rank"])
                            if pd.notna(r["cutoff_rank"]) else None),
        })
    return {"show_category": show_category, "count": len(rows), "results": rows}
