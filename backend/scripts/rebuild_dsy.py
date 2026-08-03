"""Rebuild the DSY (Direct Second Year / DSE CAP) slice of the unified dataset.

Reads a DSE CAP cutoff workbook and replaces every exam == "DSY" row in
backend/data/engineering_cutoffs.csv.gz, leaving the MH-CET and JEE-Main rows
untouched.

Usage
-----
    python backend/scripts/rebuild_dsy.py \
        --xlsx backend/data/sources/DSE_CAP1_Cutoff_2025-26.xlsx

Expected sheet columns (first sheet is used unless --sheet is given):
    College Code | College Name | Choice Code | Course Name | Category
                 | Rank | Percentile | District

("District" is optional -- older workbooks without it still work; every
row's district is then left blank as before.)

Notes on the transforms applied (kept identical to the original import):
  * rows with a blank Course Name are dropped (4 in the 2025-26 file)
  * Choice Code is a STRING; pure-digit codes shorter than 10 chars are
    zfill(10)-restored because Excel eats leading zeros
  * District is cleaned (stripped, trailing dots removed, known typos
    fixed e.g. "NADURBAR" -> "NANDURBAR") so it lines up with district
    names used elsewhere in the app (home-university mapping, etc.)
  * status is blank (DSE CAP has no separate quota column) and minority
    is "Non-Minority" for every row
"""
from __future__ import annotations

import argparse
import os
import sys

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
DEFAULT_DATASET = os.path.join(BACKEND, "data", "engineering_cutoffs.csv.gz")
DEFAULT_XLSX = os.path.join(
    BACKEND, "data", "sources", "DSE_CAP1_Cutoff_2025-26.xlsx")

COLUMNS = [
    "exam", "college_code", "choice_code", "college_name", "district",
    "branch", "category", "status", "minority",
    "cutoff_percentile", "cutoff_rank",
]

RENAME = {
    "College Code": "college_code",
    "College Name": "college_name",
    "Choice Code": "choice_code",
    "Course Name": "branch",
    "Category": "category",
    "Rank": "cutoff_rank",
    "Percentile": "cutoff_percentile",
}

# columns that are nice-to-have but not required in every workbook
OPTIONAL_RENAME = {
    "District": "district",
}

# known typos / stray-whitespace variants seen in DSE CAP workbooks,
# normalized to the canonical district name used across the app
_DISTRICT_FIXES = {
    "NADURBAR": "NANDURBAR",
    "RAIGAD.": "RAIGAD",
    "SINDHUDURG.": "SINDHUDURG",
}


def _clean_district(value) -> str:
    if pd.isna(value):
        return ""
    d = str(value).strip().rstrip(".").strip()
    if not d:
        return ""
    return _DISTRICT_FIXES.get(d.upper(), d.upper())


def _clean_choice_code(value) -> str:
    """Choice codes are strings; restore leading zeros Excel dropped."""
    if pd.isna(value):
        return ""
    code = str(value).strip()
    if code.endswith(".0") and code[:-2].isdigit():   # float-ified by Excel
        code = code[:-2]
    if code.isdigit() and len(code) < 10:
        code = code.zfill(10)
    return code


def build_dsy_frame(xlsx_path: str, sheet: str | int = 0) -> pd.DataFrame:
    raw = pd.read_excel(xlsx_path, sheet_name=sheet, dtype=str)
    missing = [c for c in RENAME if c not in raw.columns]
    if missing:
        raise SystemExit(f"Sheet is missing expected columns: {missing}")

    before = len(raw)
    raw = raw[raw["Course Name"].notna()
              & (raw["Course Name"].astype(str).str.strip() != "")]
    dropped = before - len(raw)

    df = raw.rename(columns=RENAME)[list(RENAME.values())].copy()
    df["choice_code"] = raw["Choice Code"].map(_clean_choice_code)
    for col in ("college_code", "college_name", "branch", "category"):
        df[col] = df[col].fillna("").astype(str).str.strip()
    for col in ("cutoff_rank", "cutoff_percentile"):
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # DSE CAP has no quota/status column and no minority split.
    df["exam"] = "DSY"
    if "District" in raw.columns:
        df["district"] = raw["District"].map(_clean_district)
    else:
        df["district"] = ""
    df["status"] = ""
    df["minority"] = "Non-Minority"

    print(f"  read {before} rows, dropped {dropped} blank-course rows")
    return df[COLUMNS]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--xlsx", default=DEFAULT_XLSX,
                    help="DSE CAP cutoff workbook")
    ap.add_argument("--sheet", default=0,
                    help="sheet name or index (default: first sheet)")
    ap.add_argument("--dataset", default=DEFAULT_DATASET,
                    help="unified engineering_cutoffs.csv.gz to update")
    args = ap.parse_args()

    sheet = int(args.sheet) if str(args.sheet).isdigit() else args.sheet

    print(f"Reading {args.xlsx}")
    dsy = build_dsy_frame(args.xlsx, sheet)

    print(f"Reading {args.dataset}")
    existing = pd.read_csv(args.dataset, dtype={"choice_code": str})
    keep = existing[existing["exam"].astype(str).str.upper() != "DSY"]

    out = pd.concat([keep, dsy], ignore_index=True)[COLUMNS]
    out.to_csv(args.dataset, index=False, compression="gzip")

    print(f"\nWrote {args.dataset}")
    print(out["exam"].value_counts().to_string())
    print(f"total rows           : {len(out)}")
    print(f"DSY colleges         : {dsy['college_code'].nunique()}")
    print(f"DSY courses          : {dsy['branch'].nunique()}")
    print(f"DSY categories       : {dsy['category'].nunique()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
