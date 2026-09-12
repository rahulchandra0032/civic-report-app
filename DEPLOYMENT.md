# Deployment Guide — Render + Neon + GitHub

## Published URLs (after setup)
| Service | URL |
|---------|-----|
| Admin Dashboard | `https://civic-admin.onrender.com` |
| Backend API / Swagger | `https://civic-backend.onrender.com/docs` |
| AI Service | `https://civic-ai.onrender.com` |

---

## Step 1 — Push code to GitHub
```bash
cd civic-report-app
git add -A
git commit -m "Civic Issue Reporting System - full stack"
# create a repo on github.com (empty), then:
git remote add origin https://github.com/<USER>/civic-report-app.git
git push -u origin main
```

## Step 2 — Create Neon PostGIS database (Free)
1. Go to https://neon.tech → Sign up → Create project
2. Note the connection string:
   ```
   postgresql://<user>:<password>@<host>/<db>?sslmode=require
   ```
3. Convert to asyncpg format (add pending for readonly cluster):
   ```
   DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<db>?ssl=require
   DATABASE_URL_SYNC=postgresql://<user>:<password>@<host>/<db>?sslmode=require
   ```
4. The backend runs `CREATE EXTENSION postgis` + creates tables automatically on first boot.

## Step 3 — Deploy backend to Render (Free)
1. Sign up at https://render.com → New → Web Service → Connect GitHub repo
2. Root directory: `backend`
3. Runtime: Python
4. Build: `pip install -r requirements.txt`
5. Start: `python scripts/init_db.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables: `DATABASE_URL` (asyncpg), `DATABASE_URL_SYNC`, `JWT_SECRET_KEY`
7. Deploy. Service URL: `https://civic-backend.onrender.com`

> **Or use the blueprint (one-click):** New → Blueprint → connect repo → Render reads `render.yaml`, creates backend + admin + ai together. Just fill in the `DATABASE_URL` env vars at the end.

## Step 4 — Deploy admin dashboard (Free)
Same GitHub repo → New → Web Service → Root: `admin-web`
- Runtime: Node
- Build: `npm install && CI=false npm run build`
- Start: `npx serve -s build -l $PORT`
- Env var: `REACT_APP_API_URL=https://civic-backend.onrender.com/api/v1`
- URL: `https://civic-admin.onrender.com`

## Step 5 — Use it
- Open admin dashboard URL
- Enter phone `9999999999` → OTP debug code appears on screen → login
- Deployed database auto-seeds an admin user + 5 sample Ranchi wards

---

## ⚠️ Notes
- **AI service**: kept optional. Admin dashboard and reporting work without it. If added, use `https://civic-ai.onrender.com` and update `AI_SERVICE_URL`.
- **Mobile app**: for a published app store version you'd need EAS Build + your own API URL.
- **Images**: citizens report with image *URLs*. For demo, image fields accept any URL (no file upload yet).
- **admin-web build** requires public env at build time — set `REACT_APP_API_URL` before build.