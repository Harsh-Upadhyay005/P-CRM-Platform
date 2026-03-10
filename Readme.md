# P-CRM — Smart Citizen Grievance Management Platform

> **Production-grade, multi-tenant political CRM for government offices.**  
> Every citizen complaint — received, tracked, assigned, escalated, resolved. Zero information loss. Full accountability.

<div align="center">

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-p--crm--platform.vercel.app-blue?style=for-the-badge)](https://p-crm-platform.vercel.app)
[![YouTube Demo](https://img.shields.io/badge/▶%20Watch%20Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtu.be/mSzsh3HA2A8)

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js)](https://nextjs.org)
[![Backend](https://img.shields.io/badge/Backend-Express%205%20ESM-green?logo=node.js)](https://expressjs.com)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql)](https://postgresql.org)
[![Cache](https://img.shields.io/badge/Cache-Upstash%20Redis-red?logo=redis)](https://upstash.com)
[![Storage](https://img.shields.io/badge/Storage-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![Deploy](https://img.shields.io/badge/Deployed%20on-Render%20%2B%20Vercel-black)](https://render.com)

</div>

---

## What Is This?

P-CRM is a smart grievance management platform built for government municipalities and political constituency offices. It replaces the chaos of WhatsApp groups, paper registers, and scattered spreadsheets with a single structured system where **every citizen complaint has an owner, a deadline, and a paper trail**.

### The Problem

| Pain Point                         | Reality Today                                                 |
| ---------------------------------- | ------------------------------------------------------------- |
| Complaints come in from everywhere | WhatsApp, phone, in-person, letters — no single record        |
| No accountability                  | Nobody knows who was supposed to act, or by when              |
| No SLA enforcement                 | Deadlines are informal — missed routinely with no consequence |
| Duplicate complaints waste time    | Same pothole gets filed 20 times, worked 20 times             |
| Citizens stay in the dark          | No tracking, no updates, no closure                           |
| Data lives in people, not systems  | When a staff member leaves, knowledge disappears with them    |

### Our Approach

```
Citizen submits  →  AI triages  →  Staff assigns  →  Officer resolves  →  Citizen feedback
      ↓                 ↓               ↓                   ↓                    ↓
 Tracking ID        Priority +      Department +        SLA timer            Satisfaction
issued instantly    duplicate       real-time           auto-escalates        rating (1-5★)
                    detection       notification        on breach
```

No complaint is lost. No deadline is invisible. No step goes undocumented.

---

## Table of Contents

1. [Live Links](#live-links)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [Role & Permission Model](#role--permission-model)
6. [Complaint Lifecycle](#complaint-lifecycle)
7. [AI Intelligence Layer](#ai-intelligence-layer)
8. [SLA Engine](#sla-engine)
9. [Real-Time Notifications](#real-time-notifications)
10. [Security Model](#security-model)
11. [Database Schema](#database-schema)
12. [API Reference](#api-reference)
13. [Quick Start — Local Dev](#quick-start--local-dev)
14. [Environment Variables](#environment-variables)
15. [Deployment](#deployment)
16. [Project Structure](#project-structure)

---

## Live Links

| Resource             | URL                                                 |
| -------------------- | --------------------------------------------------- |
| **Live Application** | https://p-crm-platform.vercel.app                   |
| **YouTube Demo**     | https://youtu.be/mSzsh3HA2A8                      |
| **GitHub Repo**      | https://github.com/Harsh-Upadhyay005/P-CRM-Platform |

---

## Key Features

### For Citizens (No Login Required)

- **Public complaint portal** — submit a complaint in under 2 minutes
- **Instant Tracking ID** — unique `PCRM-YYYYMMDD-XXXXXXXX` reference issued on submission
- **Real-time status tracking** — visit `/track/:id` at any time to see current status, assigned officer, SLA deadline, and full history
- **Feedback** — rate the resolution (1–5 stars) after the complaint is closed

### For Government Staff

- **AI-powered triage** — every complaint is automatically scored for priority (CRITICAL/HIGH/MEDIUM/LOW), sentiment, and duplicate detection — no external API, zero subscription cost
- **Role-gated workflow** — 5-level RBAC ensures officers only see their cases, department heads only see their department, and admins see everything
- **SLA auto-enforcement** — complaints that breach their department deadline are automatically escalated by a background job every 30 minutes; breach emails are dispatched to the assigned officer and department head
- **Real-time notifications** — Server-Sent Events (SSE) push instant alerts to staff on complaint assignment and status changes — no polling, no reload
- **File attachments** — photos, PDFs, site reports stored securely in Supabase with signed (1-hour) access links
- **Internal notes** — staff discussion inside the complaint record, never visible to citizens
- **Full audit trail** — every action on every record is logged with actor, timestamp, and IP address; immutable
- **7-panel analytics dashboard** — KPI cards, trend charts, officer leaderboard, SLA heatmap, escalation trends, category distribution — all scoped to the actor's authority level
- **CSV export** — any analytics report or complaint list downloadable as a spreadsheet

### For Platform Operators

- **True multi-tenancy** — each municipality/organisation is a fully isolated tenant; no data can cross tenant boundaries at the query level
- **Tenant management** — SUPER_ADMIN can provision, activate, and deactivate tenants
- **Docker Compose** — one command spins up PostgreSQL + Redis locally

---

## Tech Stack

### Backend

| Layer           | Technology                                                        |
| --------------- | ----------------------------------------------------------------- |
| Runtime         | Node.js v22+ (ESM modules)                                        |
| Framework       | Express 5.x                                                       |
| ORM             | Prisma 7.x + PrismaPg driver adapter                              |
| Database        | PostgreSQL                                                        |
| Auth            | JWT (access, 15m) + Opaque hex refresh (7d, SHA-256 hashed in DB) |
| Email           | Brevo (`sib-api-v3-sdk`)                                          |
| File Storage    | Supabase Storage                                                  |
| Token Blacklist | Upstash Redis — JWT JTI blacklist on logout / password reset      |
| File Upload     | Multer (memory buffer → Supabase)                                 |
| Password        | bcrypt                                                            |
| Real-Time       | SSE (Server-Sent Events) — native Node.js HTTP, no extra deps     |
| Security        | helmet, cors, express-rate-limit, cookie-parser                   |
| Validation      | Zod v4                                                            |
| Background Jobs | Interval-based SLA monitor (every 30 min)                         |

### Frontend

| Layer                 | Technology                                  |
| --------------------- | ------------------------------------------- |
| Framework             | Next.js 16 (App Router)                     |
| Language              | TypeScript                                  |
| State & Data Fetching | TanStack React Query v5                     |
| HTTP Client           | Axios (with 401 → auto-refresh interceptor) |
| Styling               | Tailwind CSS v4 + shadcn/ui                 |
| Animation             | Framer Motion + GSAP                        |
| 3D                    | Three.js via `@react-three/fiber` + Drei    |
| Maps                  | D3-geo (India SVG choropleth map)           |
| Forms                 | React Hook Form + Zod                       |
| Real-Time             | SSE EventSource (live notification badge)   |
| Icons                 | lucide-react                                |

---

## System Architecture

```
Browser / Mobile Client
        │
        ▼
   Next.js 16 (Vercel)          — App Router · React Query · SSE EventSource
        │  NEXT_PUBLIC_API_URL
        ▼
   Express 5 API (Render)
   ┌──────────────────────────────────────────────┐
   │  Global Middleware                           │
   │  helmet · cors · cookieParser                │
   │  express.json (50kb) · globalLimiter         │
   └──────────────────────────────────────────────┘
        │
   Per-Route Rate Limiters
        │
   Route Groups (/api/v1/...)
   auth · complaints · users · departments
   analytics · notifications · tenants · audit-logs
        │
   authMiddleware  ──→  Upstash Redis blacklist check
        │
   authorizeMinimum(minRole)   [RBAC gate]
        │
   Controllers → Services
   ┌──────────────────────────────────────────────┐
   │  tenantScope    → forTenant / assertTenant   │
   │  statusEngine   → assertRoleCanTransition    │
   │  roleHierarchy  → canAssignRole              │
   │  slaEngine      → buildSlaSummary            │
   │  ai.service     → analyzeComplaint()         │
   │  notification   → DB write + SSE emit        │
   │  sse.service    → Map<userId, Set<res>>       │
   └──────────────────────────────────────────────┘
        │
   Prisma 7 → PostgreSQL
        │
   External Services
   ┌───────────────────────────────────────────────┐
   │  Brevo       → transactional email            │
   │  Supabase    → file attachment storage        │
   │  Upstash     → JWT blacklist (Redis REST)     │
   └───────────────────────────────────────────────┘

Background Jobs (server.js)
   SLA Monitor   → every 30 min — auto-escalates breached complaints
   SSE Heartbeat → every 30 s  — ping to all open /stream connections
```

---

## Role & Permission Model

Five fixed roles, ranked by privilege:

| Role              | Level | Scope                        |
| ----------------- | ----- | ---------------------------- |
| `SUPER_ADMIN`     | 5     | Full platform — all tenants  |
| `ADMIN`           | 4     | Full tenant                  |
| `DEPARTMENT_HEAD` | 3     | Own department only          |
| `OFFICER`         | 2     | Own assigned complaints only |
| `CALL_OPERATOR`   | 1     | Own created complaints only  |

### Permission Matrix

| Capability                             | SUPER_ADMIN | ADMIN | DEPT_HEAD | OFFICER | CALL_OP |
| -------------------------------------- | :---------: | :---: | :-------: | :-----: | :-----: |
| Manage tenants                         |     ✅      |  ❌   |    ❌     |   ❌    |   ❌    |
| Manage all users (cross-tenant)        |     ✅      |  ❌   |    ❌     |   ❌    |   ❌    |
| Manage users within tenant             |     ✅      |  ✅   |    ❌     |   ❌    |   ❌    |
| Create / edit / deactivate departments |     ✅      |  ✅   |    ❌     |   ❌    |   ❌    |
| View all complaints (tenant scope)     |     ✅      |  ✅   |    ❌     |   ❌    |   ❌    |
| View department complaints             |     ✅      |  ✅   |    ✅     |   ❌    |   ❌    |
| View own assigned complaints           |     ✅      |  ✅   |    ✅     |   ✅    |   ❌    |
| View own created complaints            |     ✅      |  ✅   |    ✅     |   ✅    |   ✅    |
| Assign complaint (any dept / officer)  |     ✅      |  ✅   |    ❌     |   ❌    |   ❌    |
| Assign within own department           |     ✅      |  ✅   |    ✅     |   ❌    |   ❌    |
| Status → IN_PROGRESS / RESOLVED        |     ✅      |  ✅   |    ✅     |   ✅    |   ❌    |
| Status → ESCALATED                     |     ✅      |  ✅   |    ✅     |   ❌    |   ❌    |
| Status → CLOSED                        |     ✅      |  ✅   |    ❌     |   ❌    |   ❌    |
| Add internal notes                     |     ✅      |  ✅   |    ✅     |   ✅    |   ❌    |
| Submit feedback on own complaint       |     ✅      |  ✅   |    ✅     |   ✅    |   ✅    |
| View analytics (DEPT_HEAD = own dept)  |     ✅      |  ✅   |    ✅     |   ❌    |   ❌    |
| Export CSV                             |     ✅      |  ✅   |    ✅     |   ❌    |   ❌    |
| View audit logs                        |     ✅      |  ✅   |    ❌     |   ❌    |   ❌    |

> **ABAC enforcement:** Cross-scope access returns `404` (not `403`) to prevent resource enumeration.

---

## Complaint Lifecycle

### Status Transition Graph

```
OPEN ─────────────────────────────────► ESCALATED
  │                                          │
  ▼                                    ┌─────┴──────┐
ASSIGNED ──► IN_PROGRESS ──► RESOLVED ──► CLOSED    │
    │              │                          ▼      ▼
    └──────────────┴──────────────► ASSIGNED / IN_PROGRESS
```

**No status can be skipped.** `OPEN → CLOSED` is not a valid transition even for admins — the graph forbids it.  
Every transition is enforced by a two-layer engine: **graph validity check** (`422`) then **role permission check** (`403`).

### Role Transition Permissions

| Role              | Permitted Target Statuses              |
| ----------------- | -------------------------------------- |
| `CALL_OPERATOR`   | None — cannot change status            |
| `OFFICER`         | `IN_PROGRESS`, `RESOLVED`              |
| `DEPARTMENT_HEAD` | `IN_PROGRESS`, `RESOLVED`, `ESCALATED` |
| `ADMIN`           | All                                    |
| `SUPER_ADMIN`     | All                                    |

### Assignment Rules

1. Only `ADMIN` or `DEPARTMENT_HEAD` may assign
2. Target officer must be in the same tenant
3. `CALL_OPERATOR` cannot be assigned as a handler
4. `DEPARTMENT_HEAD` can only assign within their own department
5. First assignment auto-transitions `OPEN → ASSIGNED`

---

## AI Intelligence Layer

> **Zero external API cost.** All three engines run in-process on every new complaint.

`analyzeComplaint(description, category, priority, tenantId)` runs all three in parallel and merges output into the Prisma create call.

| Engine                  | How It Works                                                                                   | Output                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Priority Prediction** | Keyword density + urgency phrase matching + emergency category boosts                          | `aiScore` [0,1], `suggestedPriority` (CRITICAL/HIGH/MEDIUM/LOW), `confidence` — auto-applied on create |
| **Sentiment Analysis**  | Lexicon-based scorer with intensifier weighting (`very` → 1.5×) and negation handling          | `sentimentScore` [-1,+1] — near -1 = angry/distressed, near +1 = praise                                |
| **Duplicate Detection** | TF cosine-similarity vs last 200 complaints in same tenant (90-day window, stop-word filtered) | `duplicateScore` [0,1], `potentialDuplicateId` if score > 0.7                                          |

---

## SLA Engine

Each department has a configurable `slaHours` deadline (default: 48h).

| SLA State  | Condition                       | System Action                                                    |
| ---------- | ------------------------------- | ---------------------------------------------------------------- |
| `OK`       | < 75% of SLA elapsed            | None                                                             |
| `WARNING`  | ≥ 75% elapsed, not yet breached | Visual indicator in UI                                           |
| `BREACHED` | Deadline passed                 | Background job auto-escalates; email sent to dept head + officer |

The **SLA Monitor** runs every 30 minutes and:

1. Fetches all `OPEN / ASSIGNED / IN_PROGRESS` complaints with a department assigned
2. Checks each against its department's `slaHours`
3. Transitions breached complaints to `ESCALATED` + writes `ComplaintStatusHistory`
4. Sends breach email to department head and assigned officer

`buildSlaSummary()` is embedded in every complaint response when a department is assigned:

```json
{
  "state": "WARNING",
  "deadline": "2026-03-12T10:00:00.000Z",
  "breached": false,
  "remainingMs": 14400000,
  "remainingLabel": "4h 0m remaining"
}
```

---

## Real-Time Notifications

Delivered via **Server-Sent Events (SSE)** — no WebSocket server required.

```
Client opens GET /api/v1/notifications/stream  (EventSource, withCredentials)
  → Server sends: event: connected  →  { unreadCount: N }
  → Connection held open (no res.end())

When a complaint is assigned or status changes:
  DB write (createManyAndReturn) + emitToUser(userId, "notification", payload)
  → Writes to all open Set<res> for that userId

Every 30 seconds:
  broadcastPing() → event: ping  (keeps proxy / load-balancer alive)

On browser disconnect:
  req.on("close") → removeClient(userId, res)
```

| Trigger            | Recipients                           | Note                                        |
| ------------------ | ------------------------------------ | ------------------------------------------- |
| Complaint assigned | Assigned officer                     | Actor excluded                              |
| Status changed     | Complaint creator + assigned officer | Actor excluded; deduplicated if same person |
| SLA breach         | Dept head + assigned officer         | Email + in-app notification                 |

---

## Security Model

| Concern              | Implementation                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Password storage     | bcrypt, configurable salt rounds                                                                      |
| Access tokens        | Short-lived JWTs (15m) in `httpOnly` cookies — JS cannot read them                                    |
| Refresh tokens       | Opaque hex, SHA-256 hashed at rest, atomic DB rotation                                                |
| JWT revocation       | Upstash Redis blacklist — JTI rejected on every authenticated request                                 |
| Brute force          | Per-route rate limiting (5 login attempts / 15 min)                                                   |
| Disposable emails    | 400+ blocked domains checked at registration                                                          |
| Tenant isolation     | All queries scoped by `tenantId` from verified JWT — no cross-tenant leak possible at the query level |
| Resource enumeration | Cross-scope ABAC violations return `404` not `403`                                                    |
| Role escalation      | Cannot assign roles equal to or above own rank                                                        |
| Self-protection      | Admins cannot deactivate or delete their own account                                                  |
| Security headers     | `helmet` — HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy                             |
| Payload limit        | `express.json({ limit: "50kb" })`                                                                     |
| Sensitive fields     | `password`, `verificationToken`, `resetToken` stripped from all responses                             |
| Account enumeration  | `forgotPassword` / `resendVerification` return identical `200` regardless of email match              |
| File access          | Supabase signed URLs, 1-hour expiry — no permanent public object links                                |
| Status integrity     | Two-layer engine: graph check (422) + role check (403); no skipping                                   |

---

## Database Schema

**12 models · PostgreSQL · Prisma 7**

| Model                    | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `Tenant`                 | Organisation / municipality — all data isolated per tenant                         |
| `Role`                   | 5 global role types (`RoleType` enum)                                              |
| `User`                   | Staff members — linked to tenant, role, and optionally a department                |
| `RefreshToken`           | SHA-256 hashed refresh tokens with expiry                                          |
| `Department`             | Operational unit — has `slaHours`, `serviceAreas[]`, and members                   |
| `Complaint`              | Core record — tracking ID, status, priority, AI scores, SLA deadline               |
| `ComplaintStatusHistory` | Immutable log of every status change (who, what, when)                             |
| `ComplaintAttachment`    | File metadata + Supabase URL per complaint                                         |
| `InternalNote`           | Staff-only notes per complaint — never visible to citizens                         |
| `Notification`           | Persisted in-app notifications per user                                            |
| `AuditLog`               | System-wide audit trail with `action`, `entityType`, `entityId`, `metadata (JSON)` |

### Key Complaint Fields

| Field            | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `trackingId`     | Human-readable: `PCRM-YYYYMMDD-XXXXXXXX`                        |
| `status`         | `OPEN / ASSIGNED / IN_PROGRESS / ESCALATED / RESOLVED / CLOSED` |
| `priority`       | `LOW / MEDIUM / HIGH / CRITICAL`                                |
| `aiScore`        | Priority confidence [0, 1]                                      |
| `sentimentScore` | Citizen sentiment [-1, +1]                                      |
| `duplicateScore` | Cosine similarity to nearest complaint [0, 1]                   |
| `slaDeadline`    | Computed from `department.slaHours` + `createdAt`               |
| `resolvedAt`     | Auto-set on `RESOLVED` or `CLOSED`                              |
| `isDeleted`      | Soft delete — records are never hard-deleted                    |

---

## API Reference

### Authentication · `/api/v1/auth`

| Method | Endpoint               | Auth   | Rate Limit | Description                             |
| ------ | ---------------------- | ------ | ---------- | --------------------------------------- |
| `POST` | `/register`            | Public | 10/hr      | Register — default role `CALL_OPERATOR` |
| `POST` | `/verify-email`        | Public | 10/15min   | Verify email with one-time token        |
| `POST` | `/resend-verification` | Public | 3/30min    | Resend verification email               |
| `POST` | `/login`               | Public | 5/15min    | Login — sets `httpOnly` cookies         |
| `POST` | `/refresh`             | Cookie | 30/15min   | Atomic token rotation                   |
| `POST` | `/logout`              | 🔒     | —          | Clear cookies + blacklist JWT           |
| `POST` | `/forgot-password`     | Public | 5/30min    | Send password reset email               |
| `POST` | `/reset-password`      | Public | 5/15min    | Reset password + clear all sessions     |

### Complaints · `/api/v1/complaints`

| Method   | Endpoint                | Auth | Min Role        | Description                                      |
| -------- | ----------------------- | ---- | --------------- | ------------------------------------------------ |
| `GET`    | `/track/:trackingId`    | ❌   | —               | Public complaint status lookup                   |
| `POST`   | `/public`               | ❌   | —               | Citizen complaint submission (rate limited)      |
| `POST`   | `/`                     | 🔒   | CALL_OPERATOR   | Staff-filed complaint (AI runs on create)        |
| `GET`    | `/`                     | 🔒   | CALL_OPERATOR   | List complaints (ABAC-scoped + full-text search) |
| `GET`    | `/:id`                  | 🔒   | CALL_OPERATOR   | Single complaint with SLA summary                |
| `PATCH`  | `/:id`                  | 🔒   | ADMIN           | Edit description / category / priority           |
| `PATCH`  | `/:id/assign`           | 🔒   | DEPARTMENT_HEAD | Assign officer + department                      |
| `PATCH`  | `/:id/status`           | 🔒   | OFFICER         | Status transition (two-layer engine)             |
| `DELETE` | `/:id`                  | 🔒   | ADMIN           | Soft delete                                      |
| `POST`   | `/:id/notes`            | 🔒   | OFFICER         | Add internal staff note                          |
| `GET`    | `/:id/notes`            | 🔒   | OFFICER         | List internal notes                              |
| `POST`   | `/:id/feedback`         | 🔒   | CALL_OPERATOR   | Satisfaction rating — creator only, once         |
| `POST`   | `/:id/attachments`      | 🔒   | CALL_OPERATOR   | Upload up to 5 files                             |
| `GET`    | `/:id/attachments`      | 🔒   | CALL_OPERATOR   | List attachments (signed URLs, 1-hr expiry)      |
| `DELETE` | `/:id/attachments/:aid` | 🔒   | ADMIN           | Delete from DB + Supabase                        |

### Users · `/api/v1/users`

| Method   | Endpoint       | Min Role        | Description                            |
| -------- | -------------- | --------------- | -------------------------------------- |
| `GET`    | `/me`          | CALL_OPERATOR   | Own profile                            |
| `PATCH`  | `/me`          | CALL_OPERATOR   | Update name                            |
| `PATCH`  | `/me/password` | CALL_OPERATOR   | Change password                        |
| `POST`   | `/`            | ADMIN           | Create user (email pre-verified)       |
| `GET`    | `/`            | DEPARTMENT_HEAD | List users (dept-scoped for DEPT_HEAD) |
| `PATCH`  | `/:id/role`    | ADMIN           | Assign role + department               |
| `PATCH`  | `/:id/status`  | ADMIN           | Activate / deactivate                  |
| `DELETE` | `/:id`         | ADMIN           | Soft delete                            |

### Analytics · `/api/v1/analytics` (min: DEPARTMENT_HEAD)

All 7 reports are ABAC-scoped — DEPT_HEAD sees own department only; ADMIN sees full tenant; SUPER_ADMIN sees all tenants.

| Endpoint | Description |
|----------|-------------|
| `GET /overview` | Status/priority breakdown, average resolution time, and SLA breach count |
| `GET /trends` | Daily filed and resolved complaint volume over a selected date range |
| `GET /departments` | Per-department open/resolved complaints and average resolution time |
| `GET /officers` | Officer leaderboard showing resolved complaint count and average resolution time |
| `GET /sla-heatmap` | SLA breach rate categorized by department and priority |
| `GET /escalation-trends` | Daily escalation counts over a configurable date range |
| `GET /category-distribution` | Complaint volume grouped by category |
| `GET /export` | Download reports as CSV — `?report=overview`, `departments`, `officers`, or `categories` |
### Notifications · `/api/v1/notifications`

| Method  | Endpoint        | Description                                                    |
| ------- | --------------- | -------------------------------------------------------------- |
| `GET`   | `/stream`       | SSE stream — `connected` event then live `notification` events |
| `GET`   | `/`             | Paginated list (newest first)                                  |
| `GET`   | `/unread-count` | Badge count                                                    |
| `PATCH` | `/read-all`     | Mark all as read                                               |
| `PATCH` | `/:id/read`     | Mark one as read                                               |

### Tenants · `/api/v1/tenants` (SUPER_ADMIN only)

| Method   | Endpoint | Description      |
| -------- | -------- | ---------------- |
| `GET`    | `/`      | List all tenants |
| `POST`   | `/`      | Create tenant    |
| `GET`    | `/:id`   | Get tenant       |
| `PATCH`  | `/:id`   | Update tenant    |
| `DELETE` | `/:id`   | Delete tenant    |

---

## Quick Start — Local Dev

### Prerequisites

- Node.js v22+
- Docker (for local PostgreSQL + Redis) — or point to an external PostgreSQL + Upstash Redis

```bash
# 1 — Clone and install
git clone https://github.com/Harsh-Upadhyay005/P-CRM-Platform.git
cd P-CRM-Platform

# 2 — Start local databases
docker compose up -d          # PostgreSQL :5432 · Redis :6379

# 3 — Configure backend
cd Backend
# Create Backend/.env (see Environment Variables section below)

# 4 — Run migrations + generate Prisma client
npx prisma migrate dev
npx prisma generate

# 5 — Seed the 5 system roles (once per new database)
node --input-type=module --eval "
import { prisma } from './src/config/db.js';
for (const type of ['SUPER_ADMIN','ADMIN','DEPARTMENT_HEAD','OFFICER','CALL_OPERATOR'])
  await prisma.role.upsert({ where: { type }, update: {}, create: { type } });
await prisma.\$disconnect();
console.log('Roles seeded');
"

# 6 — Start backend dev server
npm run dev                   # http://localhost:5000
# Verify: GET http://localhost:5000/health → { "data": { "status": "OK" } }

# 7 — Start frontend (new terminal)
cd ../frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1" > .env.local
npm install && npm run dev    # http://localhost:3000
```

---

## Environment Variables

Create `Backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/pcrm_dev
DIRECT_URL=postgresql://postgres:password@localhost:5432/pcrm_dev

# JWT
JWT_ACCESS_SECRET=<64-char random hex>
JWT_REFRESH_SECRET=<64-char random hex>
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Email (Brevo)
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@youroffice.gov.in
BREVO_SENDER_NAME=P-CRM Portal

# Security
BCRYPT_SALT_ROUNDS=12
EMAIL_VERIFICATION_EXPIRY_MINUTES=30
RESET_PASSWORD_EXPIRY_MINUTES=15

# Upstash Redis (JWT blacklist)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Supabase Storage (file attachments)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=complaint-attachments
```

> Generate strong secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

All variables are validated at startup — the server **throws and refuses to start** if any are missing or invalid.

---

## Deployment

Deploy the backend to **Render** and the frontend to **Vercel**.  
Full step-by-step instructions including DB migration, role seeding, CORS config, and first-admin bootstrapping are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

| Service      | Platform                              | Key Config                                                                                                      |
| ------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Backend API  | Render Web Service                    | Root: `Backend` · Build: `npm install && npx prisma generate && npx prisma migrate deploy` · Start: `npm start` |
| Frontend     | Vercel                                | Root: `frontend` · Env: `NEXT_PUBLIC_API_URL=https://<backend>.onrender.com/api/v1`                             |
| Database     | PostgreSQL (Supabase / Render / Neon) | Set `DATABASE_URL` on Render                                                                                    |
| Redis        | Upstash free tier                     | Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`                                                       |
| File Storage | Supabase Storage                      | Create bucket `complaint-attachments`, set service role key                                                     |

After deploying backend, update `FRONTEND_URL` on Render to your Vercel domain so CORS allows the browser.

---

## Project Structure

```
P-CRM-Platform/
├── Backend/
│   ├── prisma/
│   │   └── schema.prisma              # 12 models, 3 enums
│   └── src/
│       ├── app.js                     # Express app — middleware + route mounting
│       ├── server.js                  # Entry point — graceful start/shutdown + SSE heartbeat
│       ├── config/
│       │   ├── db.js                  # Prisma + PrismaPg adapter singleton
│       │   ├── env.js                 # Fail-fast environment validation
│       │   └── redis.js               # Upstash Redis client
│       ├── controllers/               # HTTP handlers (thin — delegate to services)
│       ├── services/
│       │   ├── ai.service.js          # 3 in-process AI engines
│       │   ├── analytics.service.js   # 7 ABAC-scoped analytics aggregations
│       │   ├── auth.service.js        # Registration · login · token rotation
│       │   ├── complaints.service.js  # ABAC CRUD + status engine + AI on create
│       │   ├── notification.service.js # DB write + SSE push (fire-and-forget)
│       │   └── sse.service.js         # SSE registry Map<userId, Set<res>>
│       ├── jobs/
│       │   └── slaMonitor.job.js      # Background SLA check every 30 min
│       ├── middlewares/
│       │   ├── auth.middleware.js     # JWT/cookie guard → req.user + Redis blacklist
│       │   ├── role.middleware.js     # RBAC: authorize(), authorizeMinimum()
│       │   └── rateLimiters.js        # Per-route rate limit instances
│       └── utils/
│           ├── statusEngine.js        # Transition graph + assertRoleCanTransition
│           ├── slaEngine.js           # Deadline calculation + state classification
│           ├── tenantScope.js         # forTenant, assertTenant, ABAC helpers
│           └── roleHierarchy.js       # ROLE_RANK map, canAssignRole, canManageUser
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/                # login · register · verify-email · forgot/reset-pwd
│       │   ├── (protected)/
│       │   │   ├── dashboard/         # KPI cards · 3D HQ · India map · charts
│       │   │   ├── complaints/        # List + filters · new · detail
│       │   │   ├── users/             # Staff list + create + role assignment
│       │   │   ├── departments/       # CRUD + members panel
│       │   │   ├── analytics/         # 7 panels + CSV export
│       │   │   ├── notifications/     # Paginated + SSE live updates
│       │   │   ├── audit-logs/        # SUPER_ADMIN only
│       │   │   └── tenants/           # SUPER_ADMIN tenant management
│       │   ├── submit/                # Public citizen complaint portal
│       │   └── track/[trackingId]/    # Public status tracker + feedback form
│       ├── components/
│       │   ├── dashboard/             # KpiCards, TrendsChart, TeamPerformance, IndiaMapView
│       │   ├── layout/                # Sidebar, TopBar (SSE badge + notification dropdown)
│       │   └── 3d/                    # CommandCenter3D (Three.js)
│       ├── lib/api.ts                 # Typed Axios instance + all API function groups
│       └── types/index.ts             # TypeScript types: User, Complaint, SlaSummary, etc.
│
├── docs/
│   ├── PLATFORM_OVERVIEW.md           # Product overview — problem + solution narrative
│   ├── USER_GUIDE.md                  # Feature reference for all 5 roles
│   ├── DEPLOYMENT.md                  # Step-by-step Vercel + Render deployment guide
│   ├── CITIZEN_GUIDE.md               # End-user guide for citizens
│   └── implementation.md              # Full technical implementation reference
├── docker-compose.yml                 # Local PostgreSQL + Redis
└── Readme.md                          # This file
```

---

## License

MIT © [Harsh-Upadhyay005](https://github.com/Harsh-Upadhyay005)
