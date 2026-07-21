"""Pydantic request/response models."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ---------- auth ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    mobile: str = Field(default="", max_length=20)
    city: str = Field(default="", max_length=80)
    state: str = Field(default="", max_length=80)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    status: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    mobile: str
    city: str
    state: str
    role: str
    status: str
    is_active: bool
    created_at: datetime
    last_login: datetime | None
    prediction_count: int = 0
    session_active: bool = False

    class Config:
        from_attributes = True


# ---------- prediction ----------
class PredictIn(BaseModel):
    student_name: str = Field(default="", max_length=120)
    exam: str = Field(default="MH-CET")          # MH-CET | JEE-Main
    mode: str = Field(default="percentile", pattern="^(percentile|rank)$")
    value: float = Field(gt=0)
    category: str = ""                            # MH-CET CAP category
    branches: list[str] = Field(default_factory=list)   # empty => all
    districts: list[str] = Field(default_factory=list)  # empty => all
    quotas: list[str] = Field(default_factory=list)     # MH-CET seat status
    gender: str = "gender-neutral"                      # gender-neutral|ladies|any
    home_district: str = ""                             # 12th-pass district (home univ)


class CollegeListIn(BaseModel):
    exam: str = Field(default="MH-CET")
    category: str = ""
    branches: list[str] = Field(default_factory=list)
    districts: list[str] = Field(default_factory=list)
    quotas: list[str] = Field(default_factory=list)
    gender: str = "gender-neutral"


class CollegeRow(BaseModel):
    sr_no: int
    college_code: str
    college_name: str
    district: str
    branch: str
    category: str
    status: str
    cutoff_percentile: float | None = None
    cutoff_rank: int | None = None
    priority: bool = False
    home_type: str = "-"


class PredictOut(BaseModel):
    student_name: str
    exam: str
    mode: str
    value: float
    category: str
    branches: list[str]
    districts: list[str]
    show_category: bool
    count: int
    results: list[CollegeRow]
    home_university: str = ""
    prediction_id: int | None = None


# ---------- admin ----------
class WindowIn(BaseModel):
    pct_upper_buffer: float = Field(ge=0, le=50)
    pct_lower_buffer: float = Field(ge=0, le=100, default=100.0)
    rank_lower_buffer: int = Field(ge=0, le=200000)
    rank_upper_buffer: int = Field(ge=0, le=500000)
    priority_institutes: str = ""


class StatsOut(BaseModel):
    total_users: int
    pending_users: int
    approved_users: int
    rejected_users: int
    total_predictions: int
    todays_predictions: int
    total_downloads: int
    by_exam_today: dict[str, int] = {}
    by_exam_total: dict[str, int] = {}
