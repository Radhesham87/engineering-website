# Engineering College Prediction Portal (MH-CET & JEE-Main)

Predict probable engineering colleges from an **MH-CET percentile** or a
**JEE-Main percentile / rank**, filtered by branch, CAP category, and
district — backed by last year's CAP closing cutoffs. Includes an
admin-approval workflow, JWT auth, PDF reports, prediction history, an admin
dashboard, and Excel exports.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, React Hook Form, sonner, next-themes (dark mode) |
| Backend | FastAPI, SQLAlchemy 2, Pydantic v2, slowapi (rate limiting) |
| Prediction engine | Python, pandas, NumPy |
| Database | PostgreSQL (SQLite for local dev) |
| Auth | JWT (PyJWT) + bcrypt password hashing |
| PDF / Excel | ReportLab, openpyxl |
| Deploy | Frontend → Vercel · Backend → Render · DB → Render Postgres |

## Project structure

```
engineering-website/
├── backend/
│   ├── app/
│   │   ├── main.py              # app, middleware, startup, admin seed
│   │   ├── config.py            # env-driven settings
│   │   ├── models.py            # User, Prediction, Setting
│   │   ├── routers/             # auth, prediction, history, admin, dataset
│   │   └── services/            # prediction_engine, pdf_generator, excel_export
│   ├── data/engineering_cutoffs.csv.gz   # REAL MH-CET + JEE-Main cutoffs
│   ├── requirements.txt · runtime.txt · .env.example · Dockerfile · seed_admin.py
├── frontend/
│   └── src/{app,components,lib,types}
├── docker-compose.yml · render.yaml · vercel.json · .github/workflows/ci.yml
```

## The dataset

The engine reads `backend/data/engineering_cutoffs.csv.gz`, a unified file
built from real Maharashtra data (≈36,000 rows, 404 colleges, 113 branches,
40 districts across MH-CET and JEE-Main). Columns:

`exam, college_code, college_name, district, branch, category, status,
cutoff_percentile, cutoff_rank`

- **MH-CET** rows carry a Maharashtra CAP `category` (GOPENS, GSCS, GOBCS,
  EWS, …), so prediction filters by category, branch, and district.
- **JEE-Main** rows are a general merit list (no category), so prediction
  filters by branch and district only.

To refresh with new data, replace this file (same columns) or use the admin
**Dataset** upload; the engine reloads automatically.

---

## Run locally

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # edit JWT_SECRET etc.
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000` · docs at `/docs`. On first boot it
creates tables and seeds a default admin (`admin@engpredictor.com` /
`Admin@12345` — **change these in `.env`**). SQLite by default; set
`DATABASE_URL` to Postgres for production.

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

### Or: Docker (Postgres + API together)

```bash
docker compose up --build
```

---

## How prediction works

1. Pick an exam (MH-CET or JEE-Main) and enter a percentile or rank.
2. The engine filters the dataset by exam, category (MH-CET), selected
   branches, and districts.
3. It includes every college whose closing percentile is at or below your
   percentile plus a small admin-configurable reach buffer (JEE rank mode
   uses a two-sided rank band instead), then sorts best-first by closing
   percentile (then rank).
4. Admins tune the buffers live from the dashboard (**Prediction Window**).

---

## Deploy

### Backend → Render (Blueprint)

1. Push this repo to GitHub.
2. Render → **New → Blueprint**, pick the repo. `render.yaml` (repo root)
   provisions the web service + a free Postgres DB.
3. Set the secret env vars when prompted: `ADMIN_PASSWORD` and
   `FRONTEND_ORIGINS` (your Vercel URL). `JWT_SECRET` is auto-generated;
   Python is pinned to 3.12.9.

### Frontend → Vercel

1. **New Project** → import the repo → set **Root Directory** to `frontend`.
2. Add env var `NEXT_PUBLIC_API_URL` = your Render backend URL.
3. Deploy, then add the Vercel URL to `FRONTEND_ORIGINS` on Render for CORS.

---

## Security notes

bcrypt password hashing, JWT auth, Pydantic validation, a CORS allow-list,
and slowapi rate limiting are built in. Before launch: set a strong
`JWT_SECRET`, change the admin password, serve over HTTPS (Render/Vercel do
this), and restrict `FRONTEND_ORIGINS` to your real domains.

## Default credentials

- **Admin:** `admin@engpredictor.com` / `Admin@12345` (change immediately)
- **Users:** self-register, then an admin approves them before they can log in.
