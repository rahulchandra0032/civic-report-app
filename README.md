# Civic Issue Reporting & Resolution System

Govt of Jharkhand (SIH25031) - Smart City Citizen Issue Management Platform

## 🏗️ System Overview

A full-stack civic issue reporting system where citizens report infrastructure problems (potholes, garbage, streetlights, water leaks, etc.) with photos and GPS, AI classifies them automatically, and government officials track, assign, and resolve them with SLA monitoring.

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI + SQLAlchemy (async) |
| Database | PostgreSQL + PostGIS |
| AI | PyTorch + MobileNetV3 (transfer learning) |
| Mobile | React Native + Expo |
| Admin Web | React + Leaflet + Tailwind |
| Auth | JWT + OTP (SMS) |
| Deployment | Docker Compose |

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for admin-web)
- Python 3.11+ (for backend)
- Expo CLI (for mobile)

### 1. Start all backend services
```bash
docker-compose up -d
```

### 2. Run migrations & seed data
```bash
cd backend
alembic upgrade head
python scripts/seed_wards.py
```

### 3. Start Admin Web (localhost:3000)
```bash
cd admin-web
npm install
npm start
```

### 4. Start Mobile App
```bash
cd mobile
npm install
npx expo start
```

## 🔑 Authentication Flow
1. Citizen enters phone number → OTP sent (debug mode returns OTP in response)
2. On first login, user registers with name
3. JWT token returned and stored in SecureStore
4. All subsequent API calls use Bearer token

## 📱 Services

| Service | Port | Description |
|---------|------|-------------|
| Backend API | 8000 | Main FastAPI application |
| AI Service | 8001 | Image classification + severity |
| Admin Web | 3000 | Admin dashboard |
| PostgreSQL | 5432 | Database w/ PostGIS |

## 🔑 API Endpoints

### Auth
- `POST /api/v1/auth/send-otp` - Send OTP to phone
- `POST /api/v1/auth/verify-otp` - Verify OTP & get JWT
- `POST /api/v1/auth/register` - Register new user

### Issues (Citizen)
- `POST /api/v1/issues` - Report issue (title, image, GPS)
- `GET /api/v1/issues` - List issues (paginated, filterable)
- `GET /api/v1/issues/my` - User's reported issues
- `GET /api/v1/issues/:id` - Issue details
- `PATCH /api/v1/issues/:id` - Update issue
- `POST /api/v1/issues/:id/upvote` - Upvote issue

### Geo
- `GET /api/v1/geo/nearby` - Issues within radius
- `GET /api/v1/geo/heatmap` - Heatmap data
- `GET /api/v1/wards` - List wards
- `GET /api/v1/wards/boundaries` - Ward GeoJSON

### Admin
- `GET /api/v1/admin/dashboard` - Stats
- `GET /api/v1/admin/issues` - All issues (filters)
- `PATCH /api/v1/admin/issues/:id` - Update status
- `POST /api/v1/admin/assign` - Assign to worker
- `GET /api/v1/admin/sla-report` - SLA compliance

### AI Service
- `POST /ai/classify` - Image → category
- `POST /ai/severity` - Calculate severity
- `POST /ai/process` - Full pipeline

## 🧠 Severity Score Algorithm
```
severity = category_weight + upvote_score + density_score + time_factor + ai_confidence
```

| Factor | Weight |
|--------|--------|
| Category weight | 10-20 |
| Upvote score (min(upvotes×5, 30)) | 0-30 |
| Location density | 0-25 |
| Time decay | 0-20 |
| AI confidence | 0-5 |

## ⏰ SLA Thresholds
| Severity | Deadline |
|----------|----------|
| CRITICAL | 24 hours |
| HIGH | 48 hours |
| MEDIUM | 72 hours |
| LOW | 120 hours |

## 📁 Project Structure
```
civic-report-app/
├── backend/          # FastAPI + PostGIS
├── mobile/           # React Native (Expo)
├── admin-web/        # React Admin Dashboard
├── ai-service/       # PyTorch MobileNetV3
├── docker-compose.yml
└── .env.example
```

## 🔄 SLA Worker Job
Runs every 30 mins via `sla-worker` service:
- Flags breached issues (past deadline)
- Alerts admins via SMS (debug mode prints)
- Notifies citizens via push (debug mode prints)

## 🧪 Demo Flow
1. Citizen reports pothole with photo + GPS
2. AI classifies as "pothole" with 95% confidence
3. Issue appears on admin map + dashboard
4. Admin assigns to ward officer
5. Field worker marks IN_PROGRESS, uploads resolution photo
6. Citizen sees RESOLVED status + before/after photos
7. SLA tracker shows all deadlines

## 🔒 Environment Variables (.env)
```
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET_KEY=...
DEBUG=true
SMS_ENABLED=false
PUSH_ENABLED=false
```

## ⚠️ Note
- OTP SMS/Push is in debug mode (prints to console)
- Integrate real SMS gateway (Twilio/MSG91) & FCM for production
- AI model requires fine-tuning with real dataset

## 📝 License
Government of Jharkhand - Smart India Hackathon 2025
