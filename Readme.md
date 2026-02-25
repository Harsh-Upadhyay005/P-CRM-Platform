# P-CRM Platform — Backend

> **Smart Political CRM — Citizen Grievance Management System**
> Production-grade multi-tenant backend for government and political offices to receive, track, assign, escalate, and resolve citizen complaints. Includes full ABAC enforcement, atomic role-gated status transitions, SLA monitoring, an AI intelligence layer, real-time SSE notifications, file attachments (Supabase Storage), Redis token blacklisting, executive analytics, and a complete audit trail.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [Getting Started](#getting-started)
5. [Architecture Overview](#architecture-overview)
6. [Role Permission Matrix](#role-permission-matrix)
7. [Status Transition Engine](#status-transition-engine)
8. [ABAC — Attribute-Based Access Control](#abac--attribute-based-access-control)
9. [SLA System](#sla-system)
10. [AI Intelligence Layer](#ai-intelligence-layer)
11. [Real-Time Notifications (SSE)](#real-time-notifications-sse)
12. [File Attachments](#file-attachments)
13. [Background Jobs](#background-jobs)
14. [API Endpoints](#api-endpoints)
15. [Database Schema](#database-schema)
16. [Auth Flow](#auth-flow)
17. [Security Measures](#security-measures)

---

## Tech Stack

| Layer        | Technology                                                    |
| ------------ | ------------------------------------------------------------- |
| Runtime      | Node.js v22+ (ESM modules)                                    |
| Framework    | Express 5.x                                                   |
| ORM          | Prisma 7.x (`prisma-client-js`)                               |
| DB Driver    | `@prisma/adapter-pg` + `pg`                                   |
| Database     | PostgreSQL                                                    |
| Auth         | JWT (access) + Opaque hex (refresh, DB-stored)                |
| Email        | Brevo (`sib-api-v3-sdk`)                                      |
| File Storage | Supabase Storage (`@supabase/supabase-js`)                    |
| Token Cache  | Upstash Redis (`@upstash/redis`) — JWT blacklist              |
| File Upload  | Multer (memory storage → Supabase)                            |
| Password     | bcrypt                                                        |
| Real-Time    | SSE (Server-Sent Events) — native Node.js HTTP, no extra deps |
| Security     | helmet, cors, express-rate-limit, cookie-parser               |
| Background   | Custom interval-based SLA monitor job                         |

---

## Project Structure

```
Backend/
├── prisma/
│   └── schema.prisma                 # Database schema (12 models)
├── src/
│   ├── app.js                        # Express app — global middleware + route mounting
│   ├── server.js                     # Entry point — graceful start/shutdown + SSE heartbeat
│   ├── config/
│   │   ├── db.js                     # Prisma client + PrismaPg adapter singleton
│   │   ├── env.js                    # Validated environment variables (throws on missing)
│   │   └── redis.js                  # Upstash Redis client — JWT blacklist
│   ├── controllers/
│   │   ├── auth.controller.js        # 8 auth handlers
│   │   ├── complaints.controller.js  # 13 complaint handlers (incl. feedback, public)
│   │   ├── attachment.controller.js  # 3 file attachment handlers
│   │   ├── users.controller.js       # 7 user management handlers
│   │   ├── departments.controller.js # 5 department handlers
│   │   ├── analytics.controller.js   # 7 analytics handlers
│   │   ├── notifications.controller.js # 5 notification handlers (incl. SSE stream)
│   │   ├── tenant.controller.js      # 5 tenant management handlers
│   │   └── auditLog.controller.js    # 1 audit log handler
│   ├── jobs/
│   │   └── slaMonitor.job.js         # Background SLA monitor — auto-escalates breaches every 30 min
│   ├── middlewares/
│   │   ├── auth.middleware.js        # JWT/cookie auth guard → populates req.user
│   │   ├── role.middleware.js        # RBAC minimum-role guard (authorizeMinimum, authorize)
│   │   ├── rateLimiters.js           # Per-route rate limiters
│   │   ├── validate.middleware.js    # Zod/Joi schema validation wrapper
│   │   ├── upload.middleware.js      # Multer memory-storage configuration
│   │   └── error.middleware.js       # Global ApiError → JSON error handler
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── complaints.routes.js      # Includes public + feedback + attachment routes
│   │   ├── users.routes.js
│   │   ├── departments.routes.js
│   │   ├── analytics.routes.js       # 7 analytics endpoints
│   │   ├── notifications.routes.js   # 5 endpoints incl. SSE /stream
│   │   ├── tenant.routes.js          # SUPER_ADMIN-only tenant CRUD
│   │   └── auditLog.routes.js
│   ├── services/
│   │   ├── auth.service.js           # Registration, login, token rotation, password reset
│   │   ├── complaints.service.js     # Full ABAC CRUD + status engine + AI analysis on create
│   │   ├── users.service.js          # User management with role escalation protection
│   │   ├── departments.service.js    # Department CRUD with scope enforcement
│   │   ├── notification.service.js   # DB write + SSE emit (createManyAndReturn)
│   │   ├── sse.service.js            # SSE connection registry — Map<userId, Set<res>>
│   │   ├── analytics.service.js      # 7 analytics aggregations (ABAC-scoped)
│   │   └── ai.service.js             # 3 engines: sentiment, priority prediction, deduplication
│   ├── utils/
│   │   ├── ApiError.js               # Structured error class
│   │   ├── ApiResponse.js            # Structured success response class
│   │   ├── asyncHandler.js           # Express async wrapper
│   │   ├── helpers.js                # trackingId generator, pagination, slugify, sanitizeUser
│   │   ├── roleHierarchy.js          # Rank map, canAssignRole, canManageUser
│   │   ├── statusEngine.js           # Transition graph + role-gated assertRoleCanTransition
│   │   ├── slaEngine.js              # SLA deadline calculation, state classification, summary
│   │   └── tenantScope.js            # forTenant, assertTenant, isAssignedOfficer, isInDepartment
│   └── validators/
│       ├── complaints.validators.js  # Zod schemas: create, update, assign, status, note, feedback
│       ├── tenant.validators.js      # Zod schemas: createTenant, updateTenant
│       └── auth.validators.js        # (password strength, email format)
```

---

## Environment Variables

Create a `.env` file in `Backend/`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5433/pcrm_db

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Frontend / Backend URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Email (Brevo)
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@youroffice.gov.in
BREVO_SENDER_NAME=P-CRM Portal

# Security settings
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

All variables are validated at startup — the server will throw and refuse to start if any are missing or invalid.

---

## Getting Started

```bash
# Install dependencies
npm install

# Apply database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed roles (run once)
# SUPER_ADMIN, ADMIN, DEPARTMENT_HEAD, OFFICER, CALL_OPERATOR must exist in the Role table

# Start development server
npm run dev
```

---

## Architecture Overview

```
Browser / Mobile Client
        │
        ▼
   Express App (app.js)
        │
   ┌────┴─────────────────────────────────┐
   │  Global Middleware                   │
   │  • helmet (security headers)         │
   │  • cors (credentials: true)          │
   │  • express.json / urlencoded (50kb)  │
   │  • cookieParser                      │
   │  • globalLimiter (150/15min)         │
   │  • morgan (dev logging)              │
   └────┬─────────────────────────────────┘
        │
   Per-Route Rate Limiters
        │
   ┌────┴───────────────────────────────────────────────────────────┐
   │  Route Groups                                                  │
   │  /api/v1/auth           → auth.routes.js                      │
   │  /api/v1/complaints     → complaints.routes.js                │
   │  /api/v1/users          → users.routes.js                     │
   │  /api/v1/departments    → departments.routes.js               │
   │  /api/v1/analytics      → analytics.routes.js                 │
   │  /api/v1/notifications  → notifications.routes.js             │
   │  /api/v1/tenants        → tenant.routes.js                    │
   │  /api/v1/audit-logs     → auditLog.routes.js                  │
   └────┬───────────────────────────────────────────────────────────┘
        │
   authMiddleware (cookie → Bearer fallback → req.user + Redis blacklist check)
        │
   authorizeMinimum(minRole) — RBAC gate
        │
   Controllers → Services
        │
   ┌────┴────────────────────────────────────────────────────────────────────┐
   │  Service Layer                                                          │
   │  • tenantScope.js         → forTenant / assertTenant                   │
   │  • statusEngine.js        → assertRoleCanTransition                    │
   │  • roleHierarchy.js       → canAssignRole / canManageUser              │
   │  • slaEngine.js           → getSlaState / buildSlaSummary              │
   │  • ai.service.js          → analyzeComplaint() on every create         │
   │  • notification.service.js → createManyAndReturn + SSE emit per user   │
   │  • sse.service.js         → Map<userId, Set<res>> connection registry  │
   └────┬────────────────────────────────────────────────────────────────────┘
        │
   Prisma ORM → PostgreSQL
        │
   ┌────┴────────────────────────────────────────────────────────────────────┐
   │  External Services                                                      │
   │  • Brevo SMTP     → transactional email (verify, reset, SLA alerts)    │
   │  • Supabase       → file attachment storage (signed URLs)               │
   │  • Upstash Redis  → JWT blacklist (logout + password reset)            │
   └─────────────────────────────────────────────────────────────────────────┘

Background Process (server.js)
   • SLA Monitor     → every 30 min — auto-escalates all breached active complaints
   • SSE Heartbeat   → every 30 s  — broadcasts ping to all open /stream connections
```

### Token Architecture

```
Login
  ↓
Access Token (JWT, 15m)   → set as httpOnly cookie "accessToken"
Refresh Token (hex, 7d)   → SHA-256 hashed → stored in DB
                          → raw value set as httpOnly cookie "refreshToken" (path: /api/v1/auth)

Auth Request
  ↓
authMiddleware reads:
  1. req.cookies.accessToken   (browser)
  2. Authorization: Bearer ... (API / mobile)
  → Token JTI checked against Redis blacklist (revoked tokens rejected immediately)

Token Refresh
  ↓
Old refresh token deleted + new one created in a single DB $transaction (atomic rotation)

Logout / Password Reset
  ↓
JWT JTI added to Redis blacklist (TTL = remaining token lifetime until natural expiry)
```

---

## Role Permission Matrix

Five fixed system roles — ranked by privilege level.

| Role              | Level | Scope                        |
| ----------------- | ----- | ---------------------------- |
| `SUPER_ADMIN`     | 5     | Full platform (all tenants)  |
| `ADMIN`           | 4     | Full tenant access           |
| `DEPARTMENT_HEAD` | 3     | Own department only          |
| `OFFICER`         | 2     | Own assigned complaints only |
| `CALL_OPERATOR`   | 1     | Own created complaints only  |

### SUPER_ADMIN

| Action                                 | Allowed |
| -------------------------------------- | ------- |
| Manage tenants                         | ✅      |
| Manage roles                           | ✅      |
| Manage all users across all tenants    | ✅      |
| View all complaints across all tenants | ✅      |
| All status transitions                 | ✅      |
| View audit logs                        | ✅      |

### ADMIN

| Action                                                | Allowed |
| ----------------------------------------------------- | ------- |
| Manage users within tenant (cannot touch SUPER_ADMIN) | ✅      |
| Create / edit / deactivate departments                | ✅      |
| Assign complaints to any department / officer         | ✅      |
| View all complaints within tenant                     | ✅      |
| All status transitions within tenant                  | ✅      |
| View analytics for tenant                             | ✅      |
| Access / modify other tenants' data                   | ❌      |

### DEPARTMENT_HEAD

| Action                                                         | Allowed |
| -------------------------------------------------------------- | ------- |
| View all complaints assigned to their department               | ✅      |
| Assign complaints to officers **within their department only** | ✅      |
| Change status: `IN_PROGRESS`, `RESOLVED`, `ESCALATED`          | ✅      |
| Add internal notes to department complaints                    | ✅      |
| View complaints outside their department                       | ❌      |
| Assign officers from other departments                         | ❌      |
| Manage users or departments                                    | ❌      |

### OFFICER

| Action                                    | Allowed |
| ----------------------------------------- | ------- |
| View complaints assigned to them          | ✅      |
| Change status: `IN_PROGRESS`, `RESOLVED`  | ✅      |
| Add internal notes to assigned complaints | ✅      |
| View complaints assigned to others        | ❌      |
| Assign or re-assign complaints            | ❌      |
| Escalate complaints                       | ❌      |

### CALL_OPERATOR

| Action                                  | Allowed |
| --------------------------------------- | ------- |
| Create a new complaint                  | ✅      |
| View complaints they created            | ✅      |
| Track complaint by tracking ID (public) | ✅      |
| Change complaint status                 | ❌      |
| Assign complaints                       | ❌      |
| View complaints created by others       | ❌      |

---

## Status Transition Engine

Defined in `src/utils/statusEngine.js`. All transitions are enforced at the service layer — no status jump can be made outside the defined graph or outside the actor's role permissions.

### Transition Graph

```
OPEN ──────────────────────────────────► ESCALATED
  │                                          │
  ▼                                          ▼
ASSIGNED ──► IN_PROGRESS ──► RESOLVED ──► CLOSED
    │              │
    └──────────────┴──────────────────────► ESCALATED
                                              │
                                     ┌────────┴────────┐
                                     ▼                 ▼
                                  ASSIGNED        IN_PROGRESS
```

### Role-Based Transition Permissions

| Role              | Permitted Target Statuses              |
| ----------------- | -------------------------------------- |
| `CALL_OPERATOR`   | — (none — cannot change status)        |
| `OFFICER`         | `IN_PROGRESS`, `RESOLVED`              |
| `DEPARTMENT_HEAD` | `IN_PROGRESS`, `RESOLVED`, `ESCALATED` |
| `ADMIN`           | All (unrestricted)                     |
| `SUPER_ADMIN`     | All (unrestricted)                     |

**Two-layer enforcement in `assertRoleCanTransition(role, from, to)`:**

1. **Graph check** — is this transition defined in `TRANSITIONS`? If not → `422`
2. **Role check** — is the actor's role permitted to move to this target status? If not → `403`

Both must pass. A role with full permissions still cannot skip from `OPEN → CLOSED` because the graph forbids it.

### Assignment Rules

`assignComplaint()` enforces:

1. Only `ADMIN` or `DEPARTMENT_HEAD` may call this endpoint
2. Target officer must be in same **tenant**
3. If actor is `DEPARTMENT_HEAD` → officer must be in the **same department** as the complaint's target department
4. Automatically transitions `OPEN → ASSIGNED` on first assignment

---

## ABAC — Attribute-Based Access Control

Every data-access function in the service layer applies a two-layer filter:

### Layer 1 — Tenant Isolation (`tenantScope.js`)

All Prisma queries are scoped with `forTenant(user)` which enforces `{ tenantId: user.tenantId }`. No cross-tenant data leaks are possible at the query level.

### Layer 2 — Role-Scoped Filtering

| Role              | Filter Applied to Complaints                  |
| ----------------- | --------------------------------------------- |
| `CALL_OPERATOR`   | `WHERE createdById = :userId`                 |
| `OFFICER`         | `WHERE assignedToId = :userId`                |
| `DEPARTMENT_HEAD` | `WHERE departmentId = :dbUser.departmentId`   |
| `ADMIN`           | No additional filter (all tenant complaints)  |
| `SUPER_ADMIN`     | No filter (all complaints across all tenants) |

Cross-scope access (e.g. an Officer accessing another Officer's complaint) returns `404` rather than `403` to prevent resource enumeration.

---

## Notification System

### DB Persistence + Real-Time SSE

Every notification is written to the `Notification` table via `createManyAndReturn` and simultaneously pushed to all open SSE connections for that user. DB persistence ensures missed events are recoverable on reconnect; SSE ensures live dashboard updates without polling.

### Triggers

| Event                   | Recipients                                                | Excludes         |
| ----------------------- | --------------------------------------------------------- | ---------------- |
| Complaint assigned      | Assigned officer                                          | Actor (assigner) |
| Status changed          | Complaint creator + assigned officer                      | Actor            |
| SLA breach (background) | Department head + assigned officer (email + notification) | —                |
| Status change (email)   | Complaint creator (email to their registered address)     | —                |

### Design Principles

- Write triggers are **fire-and-forget** (`.catch(() => {})`) — notification failures never block the primary complaint transaction.
- Recipients are **deduplicated** — if `createdById === assignedToId`, only one notification is created.
- The **actor is always excluded** — no self-notifications.
- SSE emission uses `createManyAndReturn` (Prisma v5.14+) — DB write and in-memory push in a single expression.

### Exported Functions

| Function                                                                                                | Description                                      |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `notifyAssignment(complaintId, assignedToId, actorId, trackingId)`                                      | DB write + SSE push to assigned officer          |
| `notifyStatusChange(complaintId, oldStatus, newStatus, createdById, assignedToId, actorId, trackingId)` | Fan-out: DB write + SSE push to all stakeholders |
| `getUserNotifications(user, query)`                                                                     | Paginated — newest first                         |
| `markNotificationRead(notificationId, user)`                                                            | Ownership-verified single mark-as-read           |
| `markAllNotificationsRead(user)`                                                                        | Bulk mark-as-read                                |
| `getUnreadCount(user)`                                                                                  | Integer count for badge indicators               |

---

## SLA System

Defined in `src/utils/slaEngine.js`. Each `Department` has a configurable `slaHours` field (default 48h).

### SLA States

| State      | Condition                                               |
| ---------- | ------------------------------------------------------- |
| `OK`       | Less than 75% of SLA time has elapsed                   |
| `WARNING`  | ≥ 75% of SLA time has elapsed but deadline not yet past |
| `BREACHED` | Deadline has passed                                     |

Statuses `RESOLVED`, `CLOSED`, and `ESCALATED` are excluded from SLA tracking (`NON_SLA_STATUSES`).

### `buildSlaSummary(createdAt, slaHours)` Returns

```json
{
  "state": "WARNING",
  "deadline": "2026-02-27T10:00:00.000Z",
  "breached": false,
  "remainingMs": 14400000,
  "overdueMs": 0,
  "remainingLabel": "4h 0m remaining"
}
```

The `buildSlaSummary` result is embedded in every `getComplaint` and `listComplaints` response when a department is assigned.

### Background SLA Monitor

`src/jobs/slaMonitor.job.js` runs every 30 minutes and:

1. Fetches all non-deleted complaints in statuses `OPEN`, `ASSIGNED`, or `IN_PROGRESS` that have a department assigned
2. Checks each against its department's `slaHours`
3. Automatically transitions breached complaints to `ESCALATED` and records the status history entry
4. Sends an SLA breach alert email to the department head and assigned officer (if any)

---

## AI Intelligence Layer

Implemented in `src/services/ai.service.js`. Three independent engines with **no external API dependency** — all computation is in-process.

`analyzeComplaint(description, category, priority, tenantId)` runs all three engines in parallel and returns a single object suitable for spreading into a Prisma create/update call.

### Engine 1 — Sentiment Analysis

Lexicon-based scorer with intensifier weighting (`very` → 1.5×) and negation handling (`not good` → flips score).

- Output: `sentimentScore` ∈ [-1.0, +1.0]
- Near -1 = angry/distressed report; near 0 = neutral; near +1 = praise/feedback

### Engine 2 — Priority Prediction

Keyword density + urgency phrase matching + safety/emergency category boosts.

- Output: `aiScore` ∈ [0, 1], `suggestedPriority` (CRITICAL/HIGH/MEDIUM/LOW), `confidence` ∈ [0, 1]
- The `suggestedPriority` is applied automatically when the complaint is created (overrides the submitted priority if confidence is high enough)

### Engine 3 — Duplicate Detection

TF cosine-similarity against the last 200 complaints in the same tenant within the last 90 days (stop-word filtered).

- Output: `duplicateScore` ∈ [0, 1], `potentialDuplicateId` (complaint ID of closest match, if score > 0.7)

---

## Real-Time Notifications (SSE)

### How It Works

```
Client opens GET /api/v1/notifications/stream (EventSource, with credentials)
  ↓
Server sets headers: Content-Type: text/event-stream, Connection: keep-alive
  ↓
Server sends:  event: connected  →  { unreadCount: N }
  ↓
Connection stays open (no res.end())
  ↓
When createNotifications() runs:
  DB write (createManyAndReturn)
  → emitToUser(userId, "notification", payload)
     → writes to all open Set<res> for that userId
  ↓
Client receives: event: notification  →  { id, title, message, complaintId, createdAt }

Every 30 seconds:
  broadcastPing() → event: ping → { time: ISO-string }
  (keeps proxy / load-balancer alive)

On browser disconnect:
  req.on('close') → removeClient(userId, res)
```

### SSE Registry (`src/services/sse.service.js`)

| Export                            | Description                                               |
| --------------------------------- | --------------------------------------------------------- |
| `addClient(userId, res)`          | Register new stream; creates `Set<res>` per userId        |
| `removeClient(userId, res)`       | Deregister; deletes empty sets to free memory             |
| `emitToUser(userId, event, data)` | Push to all open tabs for a user; auto-removes dead conns |
| `broadcastPing()`                 | Ping all clients — called by server.js heartbeat          |
| `getConnectionCount()`            | Returns total open connections (for health monitoring)    |

### Client Integration

```js
const es = new EventSource("/api/v1/notifications/stream", {
  withCredentials: true,
});
es.addEventListener("connected", (e) => {
  badge.count = JSON.parse(e.data).unreadCount;
});
es.addEventListener("notification", (e) => {
  showToast(JSON.parse(e.data));
  badge.count++;
});
es.addEventListener("ping", () => {}); // keepalive — ignore
// EventSource reconnects automatically on disconnection
```

---

## File Attachments

Attachments are stored in **Supabase Storage**. Multer buffers the upload in memory; `attachment.service.js` streams it to Supabase and saves the resulting public URL in `ComplaintAttachment`.

- Up to **5 files per complaint** per `POST /:id/attachments` request
- **Signed URLs** (1-hour expiry) are generated when attachments are listed — never permanent public links
- File metadata (`fileName`, `fileSize`, `mimeType`, `fileUrl`) stored in `ComplaintAttachment` table
- Delete removes the record and the Supabase object in a single operation
- Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` env vars

---

## Background Jobs

### SLA Monitor (`src/jobs/slaMonitor.job.js`)

| Detail            | Value                                             |
| ----------------- | ------------------------------------------------- |
| Interval          | Every 30 minutes                                  |
| Trigger condition | Active complaint + department assigned + SLA past |
| Action            | `status → ESCALATED` + `ComplaintStatusHistory`   |
| Notification      | Email to department head + assigned officer       |
| Start / Stop      | `startSlaMonitor()` / `stopSlaMonitor()`          |

### SSE Heartbeat (server.js)

| Detail   | Value                                                 |
| -------- | ----------------------------------------------------- |
| Interval | Every 30 seconds                                      |
| Purpose  | Keep proxy connections alive, detect dead clients     |
| Action   | `broadcastPing()` → `event: ping` to all open streams |
| Cleanup  | `clearInterval(heartbeat)` on `SIGINT`/`SIGTERM`      |

---

## API Endpoints

### Auth — `/api/v1/auth`

| Method | Endpoint               | Auth            | Rate Limit | Description                                             |
| ------ | ---------------------- | --------------- | ---------- | ------------------------------------------------------- |
| `POST` | `/register`            | Public          | 10/hr      | Register new user (defaults to CALL_OPERATOR)           |
| `POST` | `/verify-email`        | Public          | 10/15min   | Verify email with one-time token                        |
| `POST` | `/resend-verification` | Public          | 3/30min    | Resend verification email                               |
| `POST` | `/login`               | Public          | 5/15min    | Login — sets httpOnly cookies                           |
| `POST` | `/refresh`             | Public (cookie) | 30/15min   | Atomic token rotation — issues new cookies              |
| `POST` | `/logout`              | 🔒 Auth         | —          | Clears cookies + deletes refresh token + blacklists JWT |
| `POST` | `/forgot-password`     | Public          | 5/30min    | Sends password reset email                              |
| `POST` | `/reset-password`      | Public          | 5/15min    | Resets password, clears all sessions, blacklists JWT    |

---

### Complaints — `/api/v1/complaints`

| Method   | Endpoint                         | Auth | Min Role        | Description                                                           |
| -------- | -------------------------------- | ---- | --------------- | --------------------------------------------------------------------- |
| `GET`    | `/track/:trackingId`             | ❌   | —               | Citizen self-service status check by tracking ID                      |
| `POST`   | `/public`                        | ❌   | —               | Citizen-facing complaint submission (rate limited, no account needed) |
| `POST`   | `/feedback/:trackingId`          | ❌   | —               | Citizen submits satisfaction rating + comment after resolution        |
| `POST`   | `/`                              | ✅   | CALL_OPERATOR   | Staff-filed complaint (AI analysis runs on create)                    |
| `GET`    | `/`                              | ✅   | CALL_OPERATOR   | List complaints (auto-scoped by role + full-text search)              |
| `GET`    | `/:id`                           | ✅   | CALL_OPERATOR   | Get single complaint with SLA summary (scoped — 404 if out of scope)  |
| `PATCH`  | `/:id`                           | ✅   | ADMIN           | Update description / category / priority                              |
| `PATCH`  | `/:id/assign`                    | ✅   | DEPARTMENT_HEAD | Assign officer + department (department scope enforced)               |
| `PATCH`  | `/:id/status`                    | ✅   | OFFICER         | Change status (two-layer role-gated transition engine)                |
| `DELETE` | `/:id`                           | ✅   | ADMIN           | Soft delete (`isDeleted: true`)                                       |
| `POST`   | `/:id/notes`                     | ✅   | OFFICER         | Add internal note (staff-only)                                        |
| `GET`    | `/:id/notes`                     | ✅   | OFFICER         | List internal notes for a complaint                                   |
| `GET`    | `/:id/feedback`                  | ✅   | OFFICER         | Get submitted citizen feedback for a complaint                        |
| `POST`   | `/:id/attachments`               | ✅   | CALL_OPERATOR   | Upload up to 5 files to Supabase Storage                              |
| `GET`    | `/:id/attachments`               | ✅   | CALL_OPERATOR   | List attachments (returns 1-hour signed URLs)                         |
| `DELETE` | `/:id/attachments/:attachmentId` | ✅   | ADMIN           | Delete attachment from DB + Supabase                                  |

---

### Users — `/api/v1/users`

| Method   | Endpoint      | Auth | Min Role        | Description                                           |
| -------- | ------------- | ---- | --------------- | ----------------------------------------------------- |
| `GET`    | `/me`         | ✅   | CALL_OPERATOR   | Get own profile                                       |
| `PATCH`  | `/me`         | ✅   | CALL_OPERATOR   | Update own profile (name, phone)                      |
| `GET`    | `/`           | ✅   | DEPARTMENT_HEAD | List users (DEPT_HEAD scoped to own department)       |
| `GET`    | `/:id`        | ✅   | DEPARTMENT_HEAD | Get user by ID (DEPT_HEAD scoped to own department)   |
| `PATCH`  | `/:id/role`   | ✅   | ADMIN           | Assign role (cannot escalate above own rank)          |
| `PATCH`  | `/:id/status` | ✅   | ADMIN           | Activate / deactivate user (self-protection enforced) |
| `DELETE` | `/:id`        | ✅   | ADMIN           | Soft delete user (cannot delete self or higher rank)  |

---

### Departments — `/api/v1/departments`

| Method   | Endpoint | Auth | Min Role        | Description                                            |
| -------- | -------- | ---- | --------------- | ------------------------------------------------------ |
| `GET`    | `/`      | ✅   | CALL_OPERATOR   | List all active departments in tenant                  |
| `GET`    | `/:id`   | ✅   | CALL_OPERATOR   | Get department by ID                                   |
| `POST`   | `/`      | ✅   | ADMIN           | Create department (auto-slug, collision check)         |
| `PATCH`  | `/:id`   | ✅   | DEPARTMENT_HEAD | Update department (DEPT_HEAD can only update own dept) |
| `DELETE` | `/:id`   | ✅   | ADMIN           | Soft delete (blocked if active users are assigned)     |

---

### Analytics — `/api/v1/analytics`

All endpoints require minimum `DEPARTMENT_HEAD`. Results are ABAC-scoped (DEPT_HEAD → own department only; ADMIN → full tenant; SUPER_ADMIN → all tenants).

| Method | Endpoint                 | Description                                                  |
| ------ | ------------------------ | ------------------------------------------------------------ |
| `GET`  | `/overview`              | Status/priority breakdown, resolution time, SLA breach count |
| `GET`  | `/trends`                | Daily complaint volume + resolution volume over a date range |
| `GET`  | `/departments`           | Per-department open/resolved counts + avg resolution time    |
| `GET`  | `/officers`              | Officer leaderboard — resolved count + avg resolution time   |
| `GET`  | `/sla-heatmap`           | SLA breach rate by department + priority matrix              |
| `GET`  | `/escalation-trends`     | Daily escalation counts over a configurable date range       |
| `GET`  | `/category-distribution` | Complaint count grouped by category                          |

---

### Notifications — `/api/v1/notifications`

| Method  | Endpoint        | Auth | Description                                                          |
| ------- | --------------- | ---- | -------------------------------------------------------------------- |
| `GET`   | `/stream`       | ✅   | SSE stream — sends `connected` event then live `notification` events |
| `GET`   | `/`             | ✅   | Paginated notification list — newest first                           |
| `GET`   | `/unread-count` | ✅   | `{ unreadCount: N }` for badge indicators                            |
| `PATCH` | `/read-all`     | ✅   | Mark all notifications as read                                       |
| `PATCH` | `/:id/read`     | ✅   | Mark a single notification as read (ownership verified)              |

---

### Tenants — `/api/v1/tenants`

All endpoints require `SUPER_ADMIN`.

| Method   | Endpoint | Description                               |
| -------- | -------- | ----------------------------------------- |
| `GET`    | `/`      | List all tenants                          |
| `POST`   | `/`      | Create a new tenant (auto-slug)           |
| `GET`    | `/:id`   | Get tenant by ID                          |
| `PATCH`  | `/:id`   | Update tenant name / slug / active status |
| `DELETE` | `/:id`   | Deactivate tenant (soft disable)          |

---

### Audit Logs — `/api/v1/audit-logs`

Requires `SUPER_ADMIN`. Returns paginated audit events filterable by `action`, `entityType`, `userId`, and date range.

---

## Database Schema

### Models

| Model                    | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `Tenant`                 | A political office (slug-based multi-tenant root)                     |
| `Role`                   | 5 fixed system roles (`type` field, seeded not dynamic)               |
| `User`                   | Staff accounts (tenant + role + optional department)                  |
| `RefreshToken`           | SHA-256 hashed opaque refresh tokens with expiry                      |
| `Department`             | Office departments; `slug` unique per tenant, configurable `slaHours` |
| `Complaint`              | Core complaint with `trackingId`, AI score fields, status             |
| `ComplaintStatusHistory` | Immutable audit trail — every status change recorded                  |
| `InternalNote`           | Staff-only notes on complaints (not shown to citizens)                |
| `Notification`           | In-app notifications per user                                         |
| `AuditLog`               | System-wide audit trail for SUPER_ADMIN                               |
| `ComplaintAttachment`    | File metadata + Supabase URL per complaint                            |
| `ComplaintFeedback`      | Citizen satisfaction rating + comment (one per complaint, immutable)  |

### Soft Delete

`User`, `Department`, and `Complaint` use soft delete (`isDeleted: boolean`). Deleted records are excluded from all queries. Hard deletes are never performed.

### Database Indexes

| Index                           | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `Complaint(tenantId)`           | Every tenant-scoped query                     |
| `Complaint(status)`             | Status filter + analytics groupBy             |
| `Complaint(priority)`           | Priority filter                               |
| `Complaint(departmentId)`       | DEPT_HEAD scope + analytics                   |
| `Complaint(assignedToId)`       | OFFICER scope                                 |
| `Complaint(createdById)`        | CALL_OPERATOR scope                           |
| `Complaint(createdAt)`          | Trend analytics + pagination ordering         |
| `Complaint(tenantId,status)`    | Most common analytics compound query          |
| `Complaint(tenantId,isDeleted)` | Tenant list queries with soft-delete filter   |
| `Notification(userId,isRead)`   | `getUnreadCount` + filtered notification list |
| `AuditLog(tenantId,action)`     | SUPER_ADMIN audit query                       |

### Complaint Fields

| Field            | Type      | Description                                                      |
| ---------------- | --------- | ---------------------------------------------------------------- |
| `trackingId`     | String    | Human-readable — `PCRM-YYYYMMDD-XXXXXXXX`                        |
| `status`         | Enum      | `OPEN / ASSIGNED / IN_PROGRESS / ESCALATED / RESOLVED / CLOSED`  |
| `priority`       | Enum      | `LOW / MEDIUM / HIGH / CRITICAL`                                 |
| `createdById`    | String?   | FK → User who logged the complaint (null for public submissions) |
| `assignedToId`   | String?   | FK → Officer currently assigned                                  |
| `departmentId`   | String?   | FK → Responsible department                                      |
| `resolvedAt`     | DateTime? | Set automatically on `RESOLVED` or `CLOSED`                      |
| `aiScore`        | Float?    | AI priority confidence score [0, 1]                              |
| `sentimentScore` | Float?    | Citizen sentiment score [-1, +1]                                 |
| `duplicateScore` | Float?    | TF cosine similarity to nearest existing complaint [0, 1]        |
| `isDeleted`      | Boolean   | Soft delete flag                                                 |

---

## Auth Flow

### Registration

1. Validate email domain (blocks 400+ disposable providers)
2. Validate password strength (regex: 8–64 chars, upper/lower/digit/special)
3. Check email not already registered
4. Verify tenant exists and is active
5. Assign default role: `CALL_OPERATOR`
6. Hash password with bcrypt
7. Create user with hashed email verification token
8. Send verification email (rollback user creation if email fails)

### Login

1. Validate credentials
2. Check account active + email verified
3. Issue access token (JWT, 15m) → `httpOnly` cookie
4. Issue refresh token (opaque hex) → SHA-256 hash stored in DB → raw value in `httpOnly` cookie

### Token Refresh

1. Read refresh token from `req.cookies.refreshToken`
2. Look up SHA-256 hash in DB
3. Atomically delete old + insert new in a single `$transaction`
4. Return new cookies

### Logout / Password Reset

1. Blacklist current JWT JTI in Redis with TTL = remaining lifetime
2. Delete all DB refresh tokens for the user
3. Clear cookies

---

## Security Measures

| Measure                     | Implementation                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Password hashing            | bcrypt with configurable salt rounds                                                     |
| Access tokens               | Short-lived JWTs (15m default) in `httpOnly` cookies                                     |
| Refresh tokens              | Opaque, SHA-256 hashed at rest, atomic DB rotation                                       |
| JWT blacklist               | Upstash Redis — revoked JTIs rejected immediately on every authenticated request         |
| XSS protection              | `httpOnly` cookies — JS cannot read tokens                                               |
| CSRF protection             | `sameSite: lax` cookies + CORS `credentials: true`                                       |
| Brute force                 | Per-route rate limiting (5 login attempts / 15 min)                                      |
| Email bombing               | `forgot-password` and `resend-verification` rate limited                                 |
| Disposable emails           | 400+ blocked domains checked at registration                                             |
| Tenant isolation            | All data queries scoped to `tenantId` from verified JWT via `forTenant(user)`            |
| Resource enumeration        | Cross-scope ABAC violations return `404` not `403`                                       |
| Sensitive field stripping   | `password`, `verificationToken`, `resetToken` never returned in responses                |
| Account enumeration         | `forgotPassword` / `resendVerification` return identical `200` regardless of email match |
| Role escalation protection  | Users cannot assign a role equal to or above their own rank                              |
| Self-protection             | Admins cannot deactivate or delete their own account                                     |
| Security headers            | `helmet` — HSTS, X-Frame-Options, X-Content-Type-Options, referrer-policy                |
| Payload limit               | `express.json({ limit: "50kb" })`                                                        |
| Status transition integrity | Two-layer engine: graph validity (`422`) + role permission (`403`) — no status skipping  |
| ABAC two-layer filtering    | Tenant scope + role-scoped attribute filter on every data query                          |
| Notification isolation      | Users can only read/mark their own notifications (ownership verified per operation)      |
| File upload safety          | Supabase signed URLs (1-hour expiry) — no permanent public object links                  |
| SLA auto-escalation         | Background job removes human dependency for critical deadline enforcement                |
