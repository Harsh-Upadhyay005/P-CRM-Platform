# P-CRM Platform — Backend Implementation Reference

> **Stack**: Node.js v22+ (ESM) · Express 5.2.1 · Prisma 7.4.1 + PrismaPg adapter · PostgreSQL · Redis (Upstash) · Brevo Email · Supabase Storage · JWT + httpOnly Cookies · SSE Real-time

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Environment Configuration](#environment-configuration)
3. [Database & Prisma Setup](#database--prisma-setup)
4. [Authentication System](#authentication-system)
5. [Token Architecture](#token-architecture)
6. [Redis Blacklist](#redis-blacklist)
7. [Email Service](#email-service)
8. [Role Hierarchy](#role-hierarchy)
9. [Tenant Isolation](#tenant-isolation)
10. [ABAC — Resource-Level Access Control](#abac--resource-level-access-control)
11. [Status Engine](#status-engine)
12. [SLA Engine](#sla-engine)
13. [AI Intelligence Layer](#ai-intelligence-layer)
14. [Complaint System](#complaint-system)
15. [Notification System & SSE](#notification-system--sse)
16. [File Attachments](#file-attachments)
17. [Analytics Layer](#analytics-layer)
18. [Audit Log System](#audit-log-system)
19. [Tenant Management](#tenant-management)
20. [Background Jobs](#background-jobs)
21. [Middleware Stack](#middleware-stack)
22. [Rate Limiting](#rate-limiting)
23. [Validators](#validators)
24. [Helpers & Utilities](#helpers--utilities)
25. [Error Handling](#error-handling)
26. [Security Patterns](#security-patterns)

---

## Project Structure

```
Backend/
├── prisma/
│   └── schema.prisma               # Single source of truth for DB schema
├── src/
│   ├── app.js                      # Express app — middleware stack, route mounting
│   ├── server.js                   # HTTP server bootstrap + background job start
│   ├── config/
│   │   ├── db.js                   # Prisma client (PrismaPg driver adapter)
│   │   ├── env.js                  # Validated environment variables (fail-fast)
│   │   └── redis.js                # Upstash Redis client
│   ├── controllers/
│   │   ├── analytics.controller.js
│   │   ├── auth.controllers.js
│   │   ├── complaints.controller.js
│   │   └── users.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js      # JWT verification (cookie-first, Bearer fallback, JTI blacklist check)
│   │   ├── role.middleware.js      # RBAC: authorize(), authorizeMinimum()
│   │   ├── error.middleware.js     # Central error handler
│   │   └── rateLimiters.js        # Per-route rate limit instances
│   ├── routes/
│   │   ├── analytics.routes.js
│   │   ├── auth.routes.js
│   │   ├── complaints.routes.js
│   │   ├── departments.routes.js
│   │   └── users.routes.js
│   ├── services/
│   │   ├── ai.service.js           # Sentiment analysis, priority prediction, duplicate detection
│   │   ├── analytics.service.js    # 7 executive analytics endpoints
│   │   ├── auth.service.js         # All auth business logic
│   │   ├── complaints.service.js   # Full complaint lifecycle + ABAC + status engine
│   │   ├── notification.service.js # DB notifications + SSE push
│   │   └── sse.service.js          # SSE connection registry
│   └── utils/
│       ├── ApiError.js
│       ├── ApiResponse.js
│       ├── asyncHandler.js
│       ├── helpers.js              # generateTrackingId, getPagination, slugify, sanitizeUser
│       ├── roleHierarchy.js        # ROLE_RANK map + rank comparison functions
│       ├── slaEngine.js            # SLA deadline computation + breach detection
│       ├── statusEngine.js         # Complaint status transition graph + validators
│       ├── tenantScope.js          # Tenant isolation + ABAC ownership helpers
│       ├── token.utils.js          # JWT generation/verification + duration helpers
│       └── validators.js           # Password strength + disposable email domain block
```

---

## Environment Configuration

**File**: `src/config/env.js`

All variables are validated at startup. Missing required variables throw immediately — fail-fast pattern prevents silent misconfiguration.

| Variable                            | Required | Description                                          |
| ----------------------------------- | -------- | ---------------------------------------------------- |
| `DATABASE_URL`                      | ✅       | PostgreSQL connection string                         |
| `DIRECT_URL`                        | ✅       | Direct DB connection for Prisma migrations           |
| `JWT_SECRET`                        | ✅       | Access token signing secret                          |
| `JWT_REFRESH_SECRET`                | ✅       | Refresh token signing secret                         |
| `JWT_ACCESS_EXPIRY`                 | ✅       | Access token duration (e.g. `"15m"`)                 |
| `JWT_REFRESH_EXPIRY`                | ✅       | Refresh token duration (e.g. `"7d"`)                 |
| `BREVO_API_KEY`                     | ✅       | Brevo email API key                                  |
| `EMAIL_FROM`                        | ✅       | Sender email address                                 |
| `FRONTEND_URL`                      | ✅       | CORS allow-list + email action links                 |
| `PORT`                              | ✅       | HTTP port                                            |
| `NODE_ENV`                          | ✅       | `development` or `production`                        |
| `BCRYPT_SALT_ROUNDS`                | ✅       | Salt rounds (NaN-guarded, falls back to 12)          |
| `EMAIL_VERIFICATION_EXPIRY_MINUTES` | ✅       | NaN-guarded, falls back to 1440 (24 h)               |
| `RESET_PASSWORD_EXPIRY_MINUTES`     | ✅       | NaN-guarded, falls back to 60                        |
| `UPSTASH_REDIS_REST_URL`            | ✅       | Upstash Redis REST URL                               |
| `UPSTASH_REDIS_REST_TOKEN`          | ✅       | Upstash Redis REST token                             |
| `SUPABASE_URL`                      | ✅       | Supabase project URL                                 |
| `SUPABASE_SERVICE_ROLE_KEY`         | ✅       | Supabase service-role key (server-side only)         |
| `SUPABASE_STORAGE_BUCKET`           | ✅       | Supabase Storage bucket name for attachments         |
| `GEMINI_API_KEY`                    | ⬜       | Google Gemini key (AI layer falls back gracefully)   |

**NaN guard pattern** (used for every numeric env var):

```js
const BCRYPT_SALT_ROUNDS = (() => {
  const n = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
  return isNaN(n) ? 12 : n;
})();
```

---

## Database & Prisma Setup

**File**: `src/config/db.js`

Prisma 7 requires a driver adapter. PrismaPg is used so the generated client works in both Node.js and edge runtimes:

```js
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
```

### Schema Models (summary)

| Model                    | Key Fields                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `Tenant`                 | id, name, slug (unique), isActive, contactEmail, contactPhone, address, createdAt           |
| `Role`                   | id, type (RoleType enum) — global, not per-tenant                                            |
| `User`                   | id, email, password (hashed), emailVerified, isActive, isDeleted, tenantId, roleId, departmentId |
| `RefreshToken`           | id, tokenHash (SHA-256), userId, expiresAt                                                   |
| `Department`             | id, name, slug (unique per tenant), slaHours, isActive, isDeleted, tenantId                  |
| `Complaint`              | id, trackingId (PCRM-YYYYMMDD-XXXXXXXX), status, priority, tenantId, createdById, assignedToId, departmentId, isDeleted, aiScore, resolvedAt, slaDeadline, isPublic, feedback, rating |
| `ComplaintStatusHistory` | id, complaintId, oldStatus, newStatus, changedById (null for system), changedAt              |
| `ComplaintAttachment`    | id, complaintId, fileName, storagePath, mimeType, size, uploadedById, createdAt              |
| `InternalNote`           | id, complaintId, userId, note, createdAt                                                     |
| `Notification`           | id, userId, complaintId?, title, message, isRead, createdAt                                  |
| `AuditLog`               | id, tenantId, userId?, action, entityType, entityId, metadata (JSON), createdAt              |

### DB Indexes

Compound indexes created for query-hot paths:

```
Complaint: [tenantId, status], [tenantId, priority], [tenantId, createdAt],
           [tenantId, assignedToId], [tenantId, departmentId]
AuditLog:  [tenantId, entityType], [tenantId, userId]
```

### Enums

```
RoleType:        SUPER_ADMIN | ADMIN | DEPARTMENT_HEAD | OFFICER | CALL_OPERATOR
ComplaintStatus: OPEN | ASSIGNED | IN_PROGRESS | ESCALATED | RESOLVED | CLOSED
Priority:        LOW | MEDIUM | HIGH | CRITICAL
```

---

## Authentication System

**Service**: `src/services/auth.service.js`
**Controller**: `src/controllers/auth.controllers.js`
**Routes**: `src/routes/auth.routes.js`

### Flow Overview

```
Register ──► verifyEmail ──► Login ──► [access cookie + refresh cookie]
                                            │
                               ┌────────────┤
                               ▼            ▼
                            refresh      logout
                            (rotate)    (revoke)
```

### `registerUser(data)`

1. Validates email domain against disposable domain blocklist.
2. Validates password strength (regex).
3. Checks email uniqueness.
4. Hashes password with bcrypt.
5. Looks up tenant; assigns default role `CALL_OPERATOR`.
6. Creates user in DB.
7. Generates + stores email verification token (hashed, with expiry).
8. Sends verification email via Brevo.
9. **Rollback**: if email send fails, deletes the created user before re-throwing (no orphan accounts).

### `loginUser({ email, password, tenantId })`

1. Finds user with role relation included.
2. Validates: email verified → account active → tenant active.
3. Compares password with bcrypt.
4. Generates opaque refresh token (32 random bytes hex).
5. Stores `SHA-256(refreshToken)` in DB with expiry.
6. Returns `{ accessToken, refreshToken, user: safeUser }`.

### `refreshTokens(rawToken)`

1. Computes `SHA-256(rawToken)`.
2. Finds matching `RefreshToken` record where expiry is in the future.
3. **Atomic rotation** via `prisma.$transaction([deleteOld, createNew])` — prevents race conditions.
4. Returns new access + refresh token pair.

### `logoutUser(rawToken, userId)`

1. Computes `SHA-256(rawToken)`.
2. Deletes record scoped to **both** `tokenHash` AND `userId` — prevents a user revoking another user's token.
3. Blacklists the **access token JTI** in Redis so it's immediately invalid even within its remaining TTL.

### Forgot / Reset Password

- `forgotPassword(email)`: silently returns for unknown emails (anti-enumeration). Stores hashed reset token with expiry. Sends email.
- `resetPassword(token, newPassword)`: validates token + expiry, validates new password strength, hashes and stores.

---

## Token Architecture

**File**: `src/utils/token.utils.js`

| Export                             | Description                                                         |
| ---------------------------------- | ------------------------------------------------------------------- |
| `generateAccessToken(payload)`     | Signs JWT with `JWT_SECRET`; payload includes `jti` (UUID v4)     |
| `generateRefreshToken()`           | 64-char hex opaque string — not a JWT                               |
| `generateEmailVerificationToken()` | 64-char hex opaque token                                            |
| `generateResetPasswordToken()`     | 64-char hex opaque token                                            |
| `verifyAccessToken(token)`         | Verifies JWT, returns decoded payload or throws                     |
| `getExpiryTime(minutes)`           | Returns `new Date(now + minutes * 60000)`                           |
| `parseDurationToDate(duration)`    | `"7d"` → `Date` 7 days from now                                    |
| `parseDurationToMs(duration)`      | `"7d"` → `604800000` ms                                            |

**JWT Payload shape**:

```json
{
  "userId": "cuid...",
  "email": "officer@dept.gov.in",
  "role": "OFFICER",
  "tenantId": "cuid...",
  "jti": "uuid-v4-unique-per-token",
  "iat": 1234567890,
  "exp": 1234568790
}
```

---

## Redis Blacklist

**File**: `src/config/redis.js`
**Used in**: `auth.middleware.js` (check on every request), `auth.service.js` (write on logout)

Uses Upstash Redis REST client (`@upstash/redis`):

```js
import { Redis } from "@upstash/redis";
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});
```

### Blacklisting Pattern

On logout, the access token's `jti` is stored with a TTL equal to the token's remaining lifetime:

```js
// In logoutUser():
const decoded = verifyAccessToken(accessToken);
const ttl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
if (ttl > 0) {
  await redis.set(`blacklist:${decoded.jti}`, "1", { ex: ttl });
}
```

On every authenticated request, `authenticate` middleware checks:

```js
const blacklisted = await redis.get(`blacklist:${decoded.jti}`);
if (blacklisted) throw new ApiError(401, "Token has been revoked");
```

This guarantees immediate token invalidation without requiring short-lived access tokens.

---

## Email Service

**File**: `src/services/email.service.js` (Brevo `sib-api-v3-sdk`)

All emails use production-quality HTML templates: government-style branding (navy `#1a3a6e`, saffron accent), table-based layout (Outlook-compatible), tricolor footer divider.

| Function                                       | Trigger                                        |
| ---------------------------------------------- | ---------------------------------------------- |
| `sendVerificationEmail(user, token)`           | After register / resend-verification           |
| `sendPasswordResetEmail(user, token)`          | After forgot-password                          |
| `sendStatusChangeEmail(user, complaint)`       | When complaint status changes                  |
| `sendSlaBreachAlertEmail(complaint, officer)`  | When SLA monitor detects a breach              |

All email calls are **fire-and-forget** (non-blocking) except in the registration/resend flows where a failure triggers a rollback.

---

## Role Hierarchy

**File**: `src/utils/roleHierarchy.js`

```
SUPER_ADMIN  (5)
    └── ADMIN  (4)
            └── DEPARTMENT_HEAD  (3)
                    └── OFFICER  (2)
                            └── CALL_OPERATOR  (1)
```

| Export                                  | Description                                    |
| --------------------------------------- | ---------------------------------------------- |
| `ROLE_RANK`                             | Frozen object: role name → numeric rank        |
| `getRank(role)`                         | Returns rank, throws on unknown role           |
| `canAssignRole(actorRole, targetRole)`  | `true` if actor rank > target rank             |
| `canManageUser(actorRole, subjectRole)` | `true` if actor rank > subject rank            |
| `isHigherThan(roleA, roleB)`            | `roleA rank > roleB rank`                      |
| `isHigherOrEqual(roleA, roleB)`         | `roleA rank >= roleB rank`                     |
| `assignableRoles(actorRole)`            | Sorted array of roles the actor may assign     |

**Escalation protection**: An actor can only assign/manage users with a strictly lower rank. Lateral and upward assignments are always blocked.

---

## Tenant Isolation

**File**: `src/utils/tenantScope.js`

Every Prisma query touching tenant-owned data uses these helpers. Direct construction of `{ tenantId: X }` is avoided to keep isolation auditable.

| Export                                | Usage                        | Description                                              |
| ------------------------------------- | ---------------------------- | -------------------------------------------------------- |
| `forTenant(user)`                     | Spread into `where:`         | Returns `{ tenantId }`, throws 500 if tenantId missing   |
| `inTenant(user)`                      | Spread into `data:`          | Semantic alias for creates                               |
| `assertTenant(resource, user, label)` | After lookup by unique field | Throws 404 if null or wrong tenant (IDOR prevention)     |

`assertTenant` always throws `404` (never `403`) — prevents confirming a resource exists to a user from a different tenant.

---

## ABAC — Resource-Level Access Control

**File**: `src/utils/tenantScope.js` · `src/services/complaints.service.js`

### `getABACFilter(user)`

Applied to every list and single-record query:

| Role            | Prisma `where` fragment added          | Effect                                  |
| --------------- | -------------------------------------- | --------------------------------------- |
| CALL_OPERATOR   | `{ createdById: userId }`              | Sees only complaints they logged        |
| OFFICER         | `{ assignedToId: userId }`             | Sees only complaints assigned to them   |
| DEPARTMENT_HEAD | DB lookup → `{ departmentId: deptId }` | Sees all complaints in their department |
| ADMIN           | `{}` (no extra filter)                 | Sees all within their tenant            |
| SUPER_ADMIN     | `{}` (no extra filter)                 | Sees all within their tenant            |

### `assertComplaintAccess(complaint, user)`

Applied after every single-record fetch. Denials always return `404` — prevents IDOR information leakage.

---

## Status Engine

**File**: `src/utils/statusEngine.js`

Single source of truth for valid complaint status transitions, role permissions per transition, and terminal states.

### Transition Graph

```
OPEN ──────────────────────► ASSIGNED
  │                              │
  └──────────► ESCALATED ◄───────┤
                   │             │
              IN_PROGRESS ───────┘
                   │
                RESOLVED
                   │
                CLOSED  (terminal)
```

| From          | Allowed `to` values           |
| ------------- | ----------------------------- |
| `OPEN`        | `ASSIGNED`, `ESCALATED`       |
| `ASSIGNED`    | `IN_PROGRESS`, `ESCALATED`    |
| `IN_PROGRESS` | `RESOLVED`, `ESCALATED`       |
| `ESCALATED`   | `ASSIGNED`, `IN_PROGRESS`     |
| `RESOLVED`    | `CLOSED`                      |
| `CLOSED`      | _(terminal — no transitions)_ |

### `ROLE_ALLOWED_TARGETS` Map

Controls which roles may drive a complaint to which target statuses:

```js
{
  OFFICER:         ["IN_PROGRESS", "RESOLVED"],
  DEPARTMENT_HEAD: ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "ESCALATED"],
  ADMIN:           ["ASSIGNED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"],
  SUPER_ADMIN:     ["ASSIGNED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"],
}
```

| Export                                           | Description                                          |
| ------------------------------------------------ | ---------------------------------------------------- |
| `isValidTransition(from, to)`                   | `boolean` — does not throw                          |
| `assertValidTransition(from, to)`               | Throws `ApiError(422)` with allowed next states     |
| `assertRoleCanTransition(role, newStatus)`       | Throws `ApiError(403)` if role isn't allowed        |
| `validNextStatuses(current)`                    | Array of valid next statuses (for frontend dropdowns)|
| `TERMINAL_STATUSES`                             | Frozen array `["CLOSED"]`                           |
| `isTerminal(status)`                            | `boolean`                                           |

---

## SLA Engine

**File**: `src/utils/slaEngine.js`

Computes SLA deadlines and breach state based on department configuration.

### `getSlaDeadline(createdAt, slaHours)`

```js
export function getSlaDeadline(createdAt, slaHours) {
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
}
```

### `getSlaState(complaint)`

Returns `"BREACHED"`, `"AT_RISK"` (within 20% of SLA window), `"ON_TRACK"`, or `null` (no SLA / non-SLA status).

**Non-SLA statuses**: `RESOLVED`, `CLOSED`, `ESCALATED` — SLA stops counting for these.

### `buildSlaSummary(complaints)`

Aggregates an array of complaints and returns:

```json
{
  "total": 42,
  "breached": 5,
  "atRisk": 3,
  "onTrack": 34,
  "breachRate": "11.90%"
}
```

Used by analytics service for the SLA heatmap and SLA health endpoints.

---

## AI Intelligence Layer

**File**: `src/services/ai.service.js`

Three in-process ML engines that run on complaint creation (non-blocking, fire-and-forget):

### Engine 1 — Sentiment Analysis

Keyword-based lexicon scoring across positive and negative word sets. Returns `{ sentiment: "POSITIVE"|"NEGATIVE"|"NEUTRAL", score: -1..1, confidence: 0..1 }`. Negative sentiment auto-elevates priority to `HIGH` if currently `LOW` or `MEDIUM`.

### Engine 2 — Priority Prediction

Multi-factor scoring:
- Urgency keyword detection (+40 per hit)
- Sentiment-to-priority mapping
- Category-to-priority mapping (e.g., `infrastructure` → `HIGH`)
- Character count bonus (longer descriptions indicate detailed issues)

Outputs `{ priority: Priority, confidence: 0..1, factors: [...] }`.

### Engine 3 — Duplicate Detection

Computes Jaccard similarity between incoming complaint description and all existing OPEN/ASSIGNED complaints in the same tenant. Returns `{ isDuplicate: boolean, confidence: 0..1, similarComplaints: [...top3] }`.

### Master Export

```js
export async function analyzeComplaint(description, category, tenantId);
// Returns: { sentiment, priority, duplicates, processingTime }
```

Called in `createComplaint` after the DB write. Results update the complaint's `aiScore` field and may adjust `priority` — stored in a second update query.

---

## Complaint System

**Service**: `src/services/complaints.service.js`

Every function enforces all 5 concerns in layered order:

```
Request
  │
  ├─ 1. Tenant Isolation     — forTenant(user) in every Prisma where/data
  ├─ 2. Soft Delete Guard    — isDeleted: false in every Prisma where
  ├─ 3. ABAC Filter          — getABACFilter(user) narrows by role ownership
  ├─ 4. Status Engine        — assertValidTransition() before any status change
  └─ 5. Role Escalation      — canManageUser() / officer eligibility on assign
```

### Key Functions

| Function                        | Notes                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `createComplaint(data, user)`   | Validates dept, generates trackingId, runs AI analysis async, stores aiScore             |
| `createPublicComplaint(data)`   | No auth required, sets `isPublic: true`, minimal fields stored                         |
| `listComplaints(query, user)`   | ABAC filter, filter params, pagination, `$transaction([findMany, count])`              |
| `getComplaint(id, user)`        | ABAC check, strips raw FK IDs, returns relations                                         |
| `getComplaintByTrackingId(id)`  | Public — returns minimal status info for citizen tracking                                |
| `assignComplaint(id, data, user)`| Validates dept + officer eligibility, auto-advances OPEN→ASSIGNED, writes status history |
| `updateComplaintStatus`         | Calls `assertValidTransition` + `assertRoleCanTransition`, sets `resolvedAt`, writes history |
| `softDeleteComplaint`           | Sets `isDeleted: true` — never hard DELETE                                             |
| `addInternalNote / getNotes`    | OFFICER: assigned only; DEPT_HEAD: dept only                                             |
| `addFeedback(trackingId, data)` | Citizen submits rating (1-5) + feedback text post-resolution                             |
| `searchComplaints(query, user)` | Full-text search across trackingId, citizenName, citizenPhone, description               |

---

## Notification System & SSE

**Files**: `src/services/notification.service.js` · `src/services/sse.service.js`
**Routes**: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`, `GET /api/v1/notifications/stream`

### DB Notifications

`createNotification(userId, data)` writes to the `Notification` table. Bulk creation uses `createManyAndReturn` (Prisma 7 feature) for atomic batch writes.

### SSE Registry

`sse.service.js` maintains an in-process `Map<userId, Set<res>>`:

```js
const connections = new Map(); // userId → Set<res>

export function addConnection(userId, res) {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId).add(res);
}

export function removeConnection(userId, res) {
  connections.get(userId)?.delete(res);
  if (connections.get(userId)?.size === 0) connections.delete(userId);
}

export function sendToUser(userId, event, data) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  userConnections.forEach(res => res.write(payload));
}
```

### SSE Stream Handler (`GET /notifications/stream`)

```
1. Set SSE headers (Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive)
2. Register connection: addConnection(userId, res)
3. Send initial "connected" event
4. On client disconnect: removeConnection(userId, res)
```

### Heartbeat

Every 30 seconds, a comment ping (`: heartbeat\n\n`) is sent to all open connections to prevent proxy timeout drops.

### Push Pattern

When a notification is created, `notification.service.js` calls `sendToUser` immediately after the DB write — no polling, no queue.

---

## File Attachments

**Files**: `src/routes/complaints.routes.js` (Multer config) · `src/services/complaints.service.js`
**Storage**: Supabase Storage

### Upload Pipeline

```
Client multipart/form-data
  └─ Multer (memoryStorage, 10 MB limit, mimeType allowlist)
       └─ supabase.storage.from(bucket).upload(path, buffer, { contentType })
            └─ ComplaintAttachment record written to DB
```

### Storage Path

```
{tenantId}/{complaintId}/{timestamp}-{safeFilename}
```

### Signed URLs

All attachment URLs are generated as time-limited signed URLs (1 hour TTL) via:

```js
const { data } = await supabase.storage
  .from(bucket)
  .createSignedUrl(attachment.storagePath, 3600);
```

### Deletion

`deleteAttachment` removes from both Supabase Storage and the DB record atomically:

```js
await supabase.storage.from(bucket).remove([attachment.storagePath]);
await prisma.complaintAttachment.delete({ where: { id } });
```

---

## Analytics Layer

**File**: `src/services/analytics.service.js`
**Routes**: `src/routes/analytics.routes.js`
**Min role**: `DEPARTMENT_HEAD`

All analytics functions apply the same ABAC filter as the complaint queries (DEPT_HEAD → department scope, ADMIN/SUPER_ADMIN → tenant scope). A **row cap of 10,000** is enforced on raw queries to prevent runaway aggregations.

| Endpoint                       | Function                  | Description                                              |
| ------------------------------ | ------------------------- | -------------------------------------------------------- |
| `GET /analytics/overview`       | `getOverview`             | Total, open, resolved, closed, avg resolution time       |
| `GET /analytics/trends`         | `getTrends`               | Complaints filed per day (last N days, default 30)       |
| `GET /analytics/by-department`  | `getByDepartment`         | Complaint count + avg resolution time per department     |
| `GET /analytics/by-category`    | `getByCategory`           | Distribution by complaint category                       |
| `GET /analytics/sla-heatmap`    | `getSlaHeatmap`           | SLA breach/at-risk/on-track count per department         |
| `GET /analytics/officer-performance` | `getOfficerPerformance` | Per-officer: assigned, resolved, avg resolution time  |
| `GET /analytics/priority-breakdown` | `getPriorityBreakdown`   | Count by priority level                                  |

---

## Audit Log System

**File**: `src/services/complaints.service.js` (and any service that writes sensitive operations)
**Model**: `AuditLog`

All sensitive mutations write an audit log record **fire-and-forget** (non-blocking, never fails the main operation):

```js
prisma.auditLog.create({
  data: {
    tenantId: user.tenantId,
    userId: user.userId,
    action: "COMPLAINT_STATUS_UPDATED",
    entityType: "Complaint",
    entityId: complaint.id,
    metadata: { oldStatus: complaint.status, newStatus, complaintId: complaint.id },
  },
}).catch(() => {}); // fire and forget
```

Queryable fields: `tenantId`, `userId`, `entityType`, `entityId`, `action`, `createdAt`.
Compound index on `[tenantId, entityType]` and `[tenantId, userId]` for fast admin queries.

---

## Tenant Management

**Routes**: `/api/v1/tenants` (SUPER_ADMIN only)

| Endpoint                  | Action                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| `POST /tenants`           | Create tenant with slug (auto-slugified from name if not provided)  |
| `GET /tenants`            | List all tenants (paginated)                                        |
| `GET /tenants/:id`        | Get single tenant with user/complaint counts                        |
| `PATCH /tenants/:id`      | Update name, contactEmail, contactPhone, address, isActive          |
| `DELETE /tenants/:id`     | Soft deactivate (`isActive: false`) — does NOT delete data          |

**Slug pattern**: `district-collector-north` — unique, URL-safe identifier used in public-facing tracking URLs.

**Deactivation effect**: Setting `isActive: false` causes all login attempts for users in that tenant to fail at the `loginUser` validation step (`"Tenant is not active"`).

---

## Background Jobs

**File**: `src/server.js` (start) · `src/services/slaMonitor.job.js` (implementation)

### SLA Monitor

Runs every **30 minutes** via `setInterval`:

```js
// server.js
import { startSlaMonitor } from "./services/slaMonitor.job.js";
startSlaMonitor(); // boots immediately, then every 30 min
```

### `tick()` Implementation

```
1. Query all complaints where:
   - status NOT IN [RESOLVED, CLOSED, ESCALATED]
   - slaDeadline < now
   - isDeleted: false

2. For each breached complaint:
   a. Update status to ESCALATED
   b. Write ComplaintStatusHistory (changedById: null → system-initiated)
   c. Send SLA breach alert email to assigned officer
   d. Create DB notification for assigned officer
   e. Push SSE event to officer's live stream

3. Log breach count or "no breaches" to console
```

**changedById: null** — explicitly marks system-initiated transitions in audit history, distinguishable from human actions.

---

## Middleware Stack

### Global (applied in `app.js` in order)

1. `helmet()` — Security headers
2. `cors({ origin, credentials: true })` — `FRONTEND_URL` always allowed; `localhost:3000` added only in `development`
3. `express.json({ limit: "10kb" })`
4. `express.urlencoded({ extended: true })`
5. `cookieParser()`
6. `globalLimiter` on `/api` prefix
7. `morgan("combined")` in production, `morgan("dev")` in development

### Per-Route

| Middleware              | Purpose                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `authenticate`          | Verifies JWT, checks JTI blacklist, attaches `req.user`          |
| `authorize(...roles)`   | Exact role allow-list check                                       |
| `authorizeMinimum(role)`| Rank-based minimum check (inclusive)                             |
| `upload.array("files")` | Multer memory-storage, 10 MB limit, 5 file max                    |

---

## Rate Limiting

**File**: `src/middlewares/rateLimiters.js`

| Limiter                     | Window | Max Requests | Notes                            |
| --------------------------- | ------ | ------------ | -------------------------------- |
| `globalLimiter`             | 15 min | 500          | Applied to entire `/api` prefix  |
| `loginLimiter`              | 15 min | 5            | `skipSuccessfulRequests: true`   |
| `registerLimiter`           | 1 hr   | 10           |                                  |
| `forgotPasswordLimiter`     | 30 min | 5            |                                  |
| `resetPasswordLimiter`      | 15 min | 5            |                                  |
| `verifyEmailLimiter`        | 15 min | 10           |                                  |
| `refreshTokenLimiter`       | 15 min | 30           |                                  |
| `resendVerificationLimiter` | 30 min | 3            | Aggressive — prevents email spam |

All limiters: `standardHeaders: true, legacyHeaders: false` (RFC 6585 `RateLimit-*` headers).

---

## Validators

**File**: `src/utils/validators.js`

### `validatePassword(password)`

Returns `{ valid: boolean, message: string }`. Rules: 8–64 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char, no spaces.

### `validateEmailDomain(email)`

Checks domain against a `Set` of ~400+ known disposable/throwaway email providers (mailinator, guerrillamail, temp-mail, yopmail, etc.). Returns `{ valid: boolean, message: string }`.

### Complaint Validators (Zod — `src/utils/validators.js`)

| Schema                        | Key Fields                                                       |
| ----------------------------- | ---------------------------------------------------------------- |
| `createComplaintSchema`       | title, description, category, priority?, citizenName, phone      |
| `updateComplaintSchema`       | description?, category?, priority? (all optional)               |
| `assignComplaintSchema`       | assignedToId?, departmentId? (at least one required)            |
| `updateStatusSchema`          | newStatus (enum ComplaintStatus)                                 |
| `addNoteSchema`               | note (min 1 char)                                               |
| `feedbackSchema`              | rating (1–5), feedback? (optional text)                         |
| `searchSchema`                | q (search query), page?, limit?                                  |

---

## Helpers & Utilities

**File**: `src/utils/helpers.js`

| Function                                  | Description                                                    |
| ----------------------------------------- | -------------------------------------------------------------- |
| `generateTrackingId()`                   | `PCRM-YYYYMMDD-XXXXXXXX` — date + 4 random crypto bytes (hex) |
| `getPagination(query)`                   | Parses `?page&limit`; max limit 100; returns `{ page, limit, skip }` |
| `paginatedResponse(data, total, page, limit)` | Standard `{ data, pagination: { total, page, limit, totalPages, hasNextPage, hasPrevPage } }` |
| `slugify(text)`                          | `"Mayor's Office, Delhi"` → `"mayors-office-delhi"`          |
| `sanitizeUser(user)`                     | Strips password, tokens, expiry fields from user object        |

---

## Error Handling

### `ApiError` — `src/utils/ApiError.js`

```js
throw new ApiError(statusCode, message, errors, stack);
```

Extends `Error`. Sets `isOperational = true` so the error middleware distinguishes expected errors from crashes.

### `ApiResponse` — `src/utils/ApiResponse.js`

Standard success shape:

```json
{ "statusCode": 200, "data": {}, "message": "Fetched successfully", "success": true }
```

### `asyncHandler` — `src/utils/asyncHandler.js`

Wraps async controllers, forwards thrown errors to `next(err)`.

### Global Error Middleware (`error.middleware.js`)

- `ApiError` instances → use `.statusCode` and `.message`
- Prisma unique constraint (`P2002`) → 409 Conflict
- Prisma not-found (`P2025`) → 404 Not Found
- JWT errors → 401 Unauthorized
- All others → 500 with generic message in production

---

## Security Patterns

### 1 — httpOnly Cookies (XSS protection)

Tokens are never in JS-accessible storage. Access token in `/` cookie, refresh token in `/api/v1/auth` path cookie.

### 2 — Redis JTI Blacklist (immediate invalidation)

```js
// Check on every authenticated request:
const blacklisted = await redis.get(`blacklist:${jti}`);
if (blacklisted) throw new ApiError(401, "Token has been revoked");
```

### 3 — Opaque Refresh Tokens (storage security)

Only `SHA-256(rawToken)` stored in DB. Raw token only ever in the httpOnly cookie — never logged, never in response bodies.

### 4 — Atomic Token Rotation (race prevention)

```js
await prisma.$transaction([
  prisma.refreshToken.delete({ where: { tokenHash: oldHash } }),
  prisma.refreshToken.create({ data: { token: newHash, userId, expiresAt } }),
]);
```

### 5 — IDOR Prevention (404 not 403)

`assertTenant` and `assertComplaintAccess` always throw `404` for cross-scope access. Never confirms existence to unauthorized requesters.

### 6 — Tenant Context Guard

`forTenant(user)` and `inTenant(user)` throw `ApiError(500)` if `user.tenantId` is falsy. This catches developer oversights where `authenticate` middleware was skipped.

### 7 — System vs Human Audit Trail

SLA monitor writes `ComplaintStatusHistory` with `changedById: null`. Human-initiated changes always carry `changedById: user.userId`. Both are queryable for accountability.

---

*For API endpoint reference and request/response shapes, see [Readme.md](../Readme.md).*
*For a stakeholder/government overview of what P-CRM offers, see [PLATFORM_OVERVIEW.md](./PLATFORM_OVERVIEW.md).*
