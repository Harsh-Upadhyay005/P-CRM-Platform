# P-CRM Frontend — Complete Implementation Plan

> This plan maps every backend API, permission rule, and data shape to a concrete frontend task.  
> Follow the phases in order — each phase depends on the one before it.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Phase 1 — Project Scaffolding](#2-phase-1--project-scaffolding)
3. [Phase 2 — API Client & Auth Infrastructure](#3-phase-2--api-client--auth-infrastructure)
4. [Phase 3 — Auth Pages](#4-phase-3--auth-pages)
5. [Phase 4 — Protected Shell (Layout)](#5-phase-4--protected-shell-layout)
6. [Phase 5 — Complaints Module](#6-phase-5--complaints-module)
7. [Phase 6 — Users Module](#7-phase-6--users-module)
8. [Phase 7 — Departments Module](#8-phase-7--departments-module)
9. [Phase 8 — Analytics Module](#9-phase-8--analytics-module)
10. [Phase 9 — Notifications & SSE](#10-phase-9--notifications--sse)
11. [Phase 10 — Audit Logs](#11-phase-10--audit-logs)
12. [Phase 11 — Tenant Management](#12-phase-11--tenant-management)
13. [Phase 12 — Public Citizen Pages](#13-phase-12--public-citizen-pages)
14. [Role-Based Rendering Reference](#14-role-based-rendering-reference)
15. [API Quick Reference](#15-api-quick-reference)

---

## 1. Tech Stack

| Layer           | Choice                                                        |
| --------------- | ------------------------------------------------------------- |
| Framework       | Next.js 15 (App Router)                                       |
| Language        | TypeScript                                                    |
| Styling         | Tailwind CSS + shadcn/ui                                      |
| Server state    | TanStack Query (React Query v5)                               |
| Forms           | React Hook Form + Zod                                         |
| Charts          | Recharts                                                      |
| HTTP            | Native `fetch` with a custom wrapper (credentials: "include") |
| Real-time       | EventSource (SSE — browser native)                            |
| Date formatting | date-fns                                                      |
| Icons           | Lucide React                                                  |

---

## 2. Phase 1 — Project Scaffolding

### Step 1.1 — Create the Next.js app

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir
cd frontend
```

### Step 1.2 — Install dependencies

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install react-hook-form @hookform/resolvers zod
npm install recharts
npm install date-fns
npm install lucide-react
npx shadcn@latest init
npx shadcn@latest add button input label card table badge dialog sheet
npx shadcn@latest add dropdown-menu select textarea toast sonner
npx shadcn@latest add skeleton tabs separator alert avatar
```

### Step 1.3 — Folder structure to create

```
src/
├── app/
│   ├── (auth)/                         # Unauthenticated pages
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify-email/page.tsx
│   │   ├── resend-verification/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (protected)/                    # All authenticated pages
│   │   ├── layout.tsx                  # Sidebar + notification shell
│   │   ├── dashboard/page.tsx
│   │   ├── complaints/
│   │   │   ├── page.tsx                # List
│   │   │   ├── new/page.tsx            # Create
│   │   │   └── [id]/page.tsx           # Detail
│   │   ├── users/
│   │   │   ├── page.tsx                # List
│   │   │   └── [id]/page.tsx           # Detail
│   │   ├── departments/
│   │   │   ├── page.tsx                # List
│   │   │   └── [id]/page.tsx           # Detail/Edit
│   │   ├── analytics/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── audit-logs/page.tsx         # ADMIN+
│   │   ├── tenants/                    # SUPER_ADMIN only
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── profile/page.tsx
│   ├── track/[trackingId]/page.tsx     # PUBLIC — citizen status tracker
│   ├── portal/[tenantSlug]/page.tsx    # PUBLIC — citizen complaint filing
│   ├── feedback/[trackingId]/page.tsx  # PUBLIC — citizen feedback form
│   ├── layout.tsx
│   └── page.tsx                        # Redirect to /login or /dashboard
├── lib/
│   ├── api.ts                          # Fetch wrapper + all API functions
│   ├── auth.ts                         # Auth context + token refresh logic
│   ├── query-client.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useNotifications.ts             # SSE connection hook
│   └── useRole.ts
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── NotificationBell.tsx
│   ├── complaints/
│   │   ├── ComplaintCard.tsx
│   │   ├── ComplaintFilters.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── PriorityBadge.tsx
│   │   ├── StatusTimeline.tsx
│   │   ├── AssignForm.tsx
│   │   ├── StatusUpdateForm.tsx
│   │   ├── InternalNotes.tsx
│   │   ├── AttachmentList.tsx
│   │   └── FeedbackView.tsx
│   ├── analytics/
│   │   ├── OverviewCards.tsx
│   │   ├── TrendsChart.tsx
│   │   ├── DepartmentTable.tsx
│   │   ├── OfficerLeaderboard.tsx
│   │   ├── SlaHeatmap.tsx
│   │   ├── EscalationChart.tsx
│   │   └── CategoryChart.tsx
│   └── shared/
│       ├── PageHeader.tsx
│       ├── DataTable.tsx
│       ├── Pagination.tsx
│       ├── ConfirmDialog.tsx
│       ├── EmptyState.tsx
│       └── ErrorMessage.tsx
├── types/
│   └── index.ts                        # All TypeScript interfaces
└── middleware.ts                       # Route guard — redirect unauthenticated
```

### Step 1.4 — Environment file

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Step 1.5 — `next.config.ts`

Optionally add a dev proxy so browser requests to `/api/v1` are forwarded to the backend, avoiding CORS issues in development:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

If using the proxy rewrite, change `NEXT_PUBLIC_API_URL` to an empty string so all requests go to `/api/v1` (same origin). If not using the proxy, ensure the backend has `CORS_ORIGIN` set to the frontend's URL.

### Step 1.6 — Root redirect page (`src/app/page.tsx`)

The root `/` route should redirect based on auth state:

```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function RootPage() {
  const token = cookies().get("accessToken");
  if (token) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
```

---

## 3. Phase 2 — API Client & Auth Infrastructure

### Step 2.1 — TypeScript types (`src/types/index.ts`)

Define all interfaces from backend response shapes:

```typescript
export type RoleType =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DEPARTMENT_HEAD"
  | "OFFICER"
  | "CALL_OPERATOR";
export type ComplaintStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SlaState = "OK" | "WARNING" | "BREACHED";

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: { id: string; type: RoleType };
  department: { id: string; name: string; slug: string } | null;
}

export interface Complaint {
  id: string;
  trackingId: string;
  citizenName: string;
  citizenPhone: string;
  citizenEmail: string | null;
  category: string | null;
  priority: Priority;
  status: ComplaintStatus;
  description: string;
  aiScore: number | null;
  sentimentScore: number | null;
  duplicateScore: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  department: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  statusHistory: StatusHistoryEntry[];
}

export interface StatusHistoryEntry {
  id: string;
  oldStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  changedAt: string;
  changedBy: { id: string; name: string } | null;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  slaHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; complaints: number };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  complaintId: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; departments: number; complaints: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface Note {
  id: string;
  note: string;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  url: string; // 1-hour signed URL (regenerated on each GET /attachments)
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
```

### Step 2.2 — Fetch wrapper (`src/lib/api.ts`)

Create a single `apiFetch` function:

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL + "/api/v1";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include", // REQUIRED — sends httpOnly cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Try silent token refresh once
    const refreshed = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) {
      // Retry the original request
      const retry = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...options.headers },
      });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({}));
        throw new ApiError(retry.status, err.message ?? "Request failed");
      }
      return retry.json().then((r) => r.data);
    } else {
      // Refresh failed — redirect to login
      window.location.href = "/login";
      throw new ApiError(401, "Session expired");
    }
  }

  if (res.status === 429) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      429,
      err.message ?? "Too many requests. Please wait and try again.",
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.message ?? "Request failed", err.errors);
  }

  const json = await res.json();
  return json.data as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: { field: string; message: string }[],
  ) {
    super(message);
  }
}
```

### Step 2.3 — Auth context (`src/lib/auth.ts` + `src/hooks/useAuth.ts`)

- Store the logged-in user in React context (persisted to `sessionStorage` or re-fetched on mount via `/users/me`).
- On app boot, call `GET /api/v1/users/me`; if it fails with 401, mark user as unauthenticated.
- Expose: `user`, `isLoading`, `login()`, `logout()`, `isAuthenticated`, `hasRole(role)`, `hasMinimumRole(role)`.

```typescript
// Role rank for client-side checks (mirrors backend ROLE_RANK)
const ROLE_RANK: Record<RoleType, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  DEPARTMENT_HEAD: 3,
  OFFICER: 2,
  CALL_OPERATOR: 1,
};

export const hasMinimumRole = (userRole: RoleType, minimum: RoleType) =>
  ROLE_RANK[userRole] >= ROLE_RANK[minimum];
```

### Step 2.4 — Query client (`src/lib/query-client.ts`)

```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 s
      retry: (count, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return count < 2;
      },
    },
  },
});
```

### Step 2.5 — Next.js middleware (`src/middleware.ts`)

Protect all routes under `/(protected)`:

```typescript
export function middleware(request: NextRequest) {
  const token = request.cookies.get("accessToken");
  const isProtected =
    request.nextUrl.pathname.startsWith("/(protected)") ||
    !request.nextUrl.pathname.startsWith("/track");
  // etc — list protected prefixes
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
```

> Note: Because tokens are httpOnly, the middleware checks cookie presence only as a fast gate; the API itself validates authenticity.

### Step 2.6 — Root layout providers (`src/app/layout.tsx`)

Wrap the entire app with `QueryClientProvider` and `AuthProvider`. This is **required** before any page can use React Query hooks or the auth context:

```typescript
// src/app/layout.tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### Step 2.7 — `useRole.ts` hook (`src/hooks/useRole.ts`)

Centralises all role-check helpers used across every page:

```typescript
import { useAuth } from "./useAuth";
import { RoleType } from "@/types";

const ROLE_RANK: Record<RoleType, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  DEPARTMENT_HEAD: 3,
  OFFICER: 2,
  CALL_OPERATOR: 1,
};

export function useRole() {
  const { user } = useAuth();
  const userRole = user?.role?.type as RoleType | undefined;

  const hasMinimumRole = (minimum: RoleType): boolean => {
    if (!userRole) return false;
    return ROLE_RANK[userRole] >= ROLE_RANK[minimum];
  };

  const isExactRole = (role: RoleType): boolean => userRole === role;

  return {
    role: userRole,
    hasMinimumRole,
    isExactRole,
    isCallOperator: hasMinimumRole("CALL_OPERATOR"),
    isOfficer: hasMinimumRole("OFFICER"),
    isDeptHead: hasMinimumRole("DEPARTMENT_HEAD"),
    isAdmin: hasMinimumRole("ADMIN"),
    isSuperAdmin: isExactRole("SUPER_ADMIN"),
  };
}
```

Usage in any component:

```typescript
const { isAdmin, isDeptHead } = useRole();
// then: {isAdmin && <DeleteButton />}
```

---

## 4. Phase 3 — Auth Pages

### All auth API functions to implement in `src/lib/api.ts`

```typescript
export const authApi = {
  register: (body) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  verifyEmail: (token) =>
    apiFetch("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  resendVerification: (email) =>
    apiFetch("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  login: (body) =>
    apiFetch<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  refresh: () => apiFetch("/auth/refresh", { method: "POST" }),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),
  forgotPassword: (email) =>
    apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (body) =>
    apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
```

### Page: `/register`

**Form fields:**

- `name` — min 2, max 100
- `email` — email format
- `password` — min 8, max 64 (show strength indicator)
- `tenantSlug` — the office slug the user belongs to

**Flow:**

1. Submit → `POST /auth/register`
2. On success → show "Check your email to verify your account" message
3. Link to `/resend-verification` in case email is missed
4. Link to `/login`

### Page: `/verify-email`

- Read `?token=` from URL query param (set by the link in the verification email)
- On mount, automatically call `POST /auth/verify-email` with the token
- Show: loading spinner → success message with link to `/login`, or error with link to `/resend-verification`

### Page: `/resend-verification`

**Form fields:** `email`

**Flow:** Submit → `POST /auth/resend-verification` → show "If unverified, a new link has been sent" (backend always returns this same message — do not vary the UI based on whether email exists)

### Page: `/login`

**Form fields:** `email`, `password`

**Flow:**

1. Submit → `POST /auth/login`
2. On success → backend sets httpOnly cookies automatically → call `GET /users/me` to populate auth context → redirect to `/dashboard`
3. Show error message from API on failure (e.g. "Email not verified" — show link to resend)

### Page: `/forgot-password`

**Form fields:** `email`

**Flow:** Submit → `POST /auth/forgot-password` → show "If email exists, a reset link has been sent"

### Page: `/reset-password`

- Read `?token=` from URL query param
  **Form fields:** `token` (hidden, from query param), `newPassword`

**Flow:**

1. Submit → `POST /auth/reset-password`
2. On success → redirect to `/login` with success toast
3. On failure ("Invalid or expired token") → link to `/forgot-password`

---

## 5. Phase 4 — Protected Shell (Layout)

### Step 5.1 — `(protected)/layout.tsx`

This wraps every authenticated page. Responsibilities:

- Check auth context on mount; redirect to `/login` if unauthenticated
- Render `<Sidebar>` + `<TopBar>` + `{children}`
- Mount the SSE notification connection (see Phase 9)

### Step 5.1a — Dashboard page (`/dashboard`)

The dashboard is role-aware. It aggregates the most important information for the logged-in user's context.

**For all roles (CALL_OPERATOR+):**

- Recent activity: call `GET /complaints?limit=5` to show the 5 most recent complaints this user can see (ABAC-scoped automatically)
- Quick-create button → `/complaints/new`
- Notification badge (unread count from SSE)

**For OFFICER+:** additionally show

- "Assigned to me" count: `GET /complaints?assignedToMe=true&status=IN_PROGRESS&limit=1` — use the `pagination.total` value
- "Open" count: `GET /complaints?status=OPEN&limit=1` → `pagination.total`

**For DEPARTMENT_HEAD+:** additionally show

- Summary stat cards from `GET /analytics/overview`: Total, Open, Escalated, Breached SLA
- Mini trends sparkline from `GET /analytics/trends?days=7`

**For ADMIN+:** additionally show

- User count shortcut → `/users`
- Department count shortcut → `/departments`

**For SUPER_ADMIN:** additionally show

- Tenant count shortcut → `/tenants`

> Implementation tip: use the `useRole()` hook to conditionally render each section.

### Step 5.2 — Sidebar

Render navigation items based on role. Use `hasMinimumRole` to conditionally show items:

| Nav Item          | Minimum Role    | Route             |
| ----------------- | --------------- | ----------------- |
| Dashboard         | CALL_OPERATOR   | `/dashboard`      |
| Complaints        | CALL_OPERATOR   | `/complaints`     |
| File Complaint    | CALL_OPERATOR   | `/complaints/new` |
| Users             | DEPARTMENT_HEAD | `/users`          |
| Departments       | CALL_OPERATOR   | `/departments`    |
| Analytics         | DEPARTMENT_HEAD | `/analytics`      |
| Notifications     | CALL_OPERATOR   | `/notifications`  |
| Audit Logs        | ADMIN           | `/audit-logs`     |
| Tenant Management | SUPER_ADMIN     | `/tenants`        |

### Step 5.3 — TopBar

- Show logged-in user's name and role badge
- Notification bell with unread count badge (live via SSE)
- Dropdown: "My Profile" → `/profile`, "Logout"

### Step 5.4 — Logout flow

1. Call `POST /auth/logout` → backend clears httpOnly cookies
2. Clear React Query cache: `queryClient.clear()`
3. Clear auth context user state
4. Redirect to `/login`

---

## 6. Phase 5 — Complaints Module

This is the largest module — implement it in sub-steps.

### Step 6.1 — All complaint API functions

```typescript
export const complaintsApi = {
  list: (params) =>
    apiFetch<PaginatedResponse<Complaint>>(
      `/complaints?${new URLSearchParams(params)}`,
    ),
  get: (id) => apiFetch<Complaint>(`/complaints/${id}`),
  create: (body) =>
    apiFetch<Complaint>("/complaints", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id, body) =>
    apiFetch<Complaint>(`/complaints/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  assign: (id, body) =>
    apiFetch<Complaint>(`/complaints/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updateStatus: (id, newStatus) =>
    apiFetch<Complaint>(`/complaints/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ newStatus }),
    }),
  delete: (id) => apiFetch(`/complaints/${id}`, { method: "DELETE" }),
  getNotes: (id) => apiFetch<Note[]>(`/complaints/${id}/notes`),
  addNote: (id, note) =>
    apiFetch<Note>(`/complaints/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
  getAttachments: (id) =>
    apiFetch<Attachment[]>(`/complaints/${id}/attachments`),
  uploadAttachments: (id, formData) =>
    apiFetch<Attachment[]>(`/complaints/${id}/attachments`, {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set multipart boundary — do NOT set Content-Type manually
    }),
  deleteAttachment: (id, attachmentId) =>
    apiFetch(`/complaints/${id}/attachments/${attachmentId}`, {
      method: "DELETE",
    }),
  getFeedback: (id) => apiFetch(`/complaints/${id}/feedback`),
  // Public (no auth)
  track: (trackingId) => apiFetch(`/complaints/track/${trackingId}`),
  publicCreate: (body) =>
    apiFetch("/complaints/public", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  submitFeedback: (trackingId, body) =>
    apiFetch(`/complaints/feedback/${trackingId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
```

### Step 6.2 — Complaint list page (`/complaints`)

**Query params to support:** `status`, `priority`, `category`, `search`, `page`, `limit`

**UI elements:**

- Search bar (debounced 400ms, hits `search` param on `description`, `citizenName`, `citizenPhone`, `trackingId`)
- Filter dropdowns: Status (all 6 statuses), Priority (4 levels)
- Sortable, paginated table with columns:
  - Tracking ID
  - Citizen Name
  - Category
  - Priority badge (colour-coded: CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=green)
  - Status badge (colour-coded)
  - Department
  - Assigned To
  - Created At
  - Actions (View)
- Pagination controls using `pagination` from response
- "New Complaint" button (visible to CALL_OPERATOR+)

**ABAC note:** The backend filters automatically per role. The frontend does not need to do anything special — just call the endpoint with the logged-in user's cookie and the backend returns only what that user is allowed to see.

### Step 6.3 — Create complaint page (`/complaints/new`)

**Accessible to:** CALL_OPERATOR+

**Form fields (map to `createComplaintSchema`):**

- `citizenName` — required, min 2
- `citizenPhone` — required, regex `\+?[\d\s\-()\/.]{7,20}`
- `citizenEmail` — optional, email format
- `description` — required, min 10, max 5000 (textarea)
- `category` — optional (free-text or predefined list)
- `priority` — optional select (LOW / MEDIUM / HIGH / CRITICAL); if left blank, AI will decide
- `departmentId` — optional, dropdown loaded from `GET /departments`

**Post-submit:** Redirect to the created complaint's detail page.

### Step 6.4 — Complaint detail page (`/complaints/[id]`)

Fetch: `GET /complaints/:id`

This page has multiple conditional sections. Render each only when the user has permission:

#### Section A — Complaint Header (all roles)

- Tracking ID, Status badge, Priority badge
- Created by, Created at, Resolved at (if resolved)
- Citizen details (name, phone, email)
- Category, Description
- AI analysis panel (if `aiScore` is not null):
  - Sentiment: score + POSITIVE/NEGATIVE/NEUTRAL label
  - Duplicate flag: if `duplicateScore > 0.65` show warning badge

#### Section B — SLA Status (all roles)

- Compute client-side from `createdAt` + department's `slaHours`
- Show: On Track (green) / Warning (amber) / Breached (red) + time remaining or overdue label

#### Section C — Status Timeline (all roles)

- Render `statusHistory` array as a vertical timeline
- Each entry: old status → new status, changed by (name or "System"), time

#### Section D — Assign Panel (DEPARTMENT_HEAD+)

- Only show if complaint is not CLOSED
- `assignedToId`: dropdown of users from `GET /users?roleType=OFFICER` (filtered to tenant)
- `departmentId`: dropdown of departments from `GET /departments`
- Submit → `PATCH /complaints/:id/assign`
- On success, invalidate complaint query

#### Section E — Status Update Panel (OFFICER+)

- Only show if complaint is not CLOSED
- Show a select with **only the valid next statuses** for the current status:
  - `OPEN` → ASSIGNED, ESCALATED
  - `ASSIGNED` → IN_PROGRESS, ESCALATED
  - `IN_PROGRESS` → RESOLVED, ESCALATED
  - `ESCALATED` → ASSIGNED, IN_PROGRESS
  - `RESOLVED` → CLOSED
  - `CLOSED` → (no options, hide panel)
- Also apply role-allowed targets:
  - OFFICER: can set IN_PROGRESS, RESOLVED
  - DEPARTMENT_HEAD: can set ASSIGNED, IN_PROGRESS, RESOLVED, ESCALATED
  - ADMIN/SUPER_ADMIN: can set any of ASSIGNED, IN_PROGRESS, ESCALATED, RESOLVED, CLOSED
- Submit → `PATCH /complaints/:id/status`

#### Section F — Edit Panel (ADMIN+)

- Only show if complaint is not CLOSED
- Fields: description, category, priority
- Submit → `PATCH /complaints/:id`

#### Section G — Internal Notes (OFFICER+)

- Fetch: `GET /complaints/:id/notes`
- Display list of notes with author name and timestamp
- Add note form: textarea (min 1, max 2000) → `POST /complaints/:id/notes`

#### Section H — Attachments (CALL_OPERATOR+)

- Fetch: `GET /complaints/:id/attachments`
- Display file list with name, size, mime type, upload time, download link (signed URL already included in response)
- Upload button: file input (accept: image/\*, application/pdf, etc.), max 5 files, 10 MB each
- `POST /complaints/:id/attachments` using `FormData` with field name `files`
- Delete button (ADMIN+): `DELETE /complaints/:id/attachments/:attachmentId`

#### Section I — Citizen Feedback (OFFICER+)

- Fetch: `GET /complaints/:id/feedback`
- If no feedback yet: show "No feedback submitted yet"
- If feedback exists: show star rating (1-5) + comment

#### Section J — Delete (ADMIN+)

- "Delete Complaint" button → confirm dialog → `DELETE /complaints/:id`
- On success, redirect to `/complaints`

---

## 7. Phase 6 — Users Module

### Step 7.1 — All user API functions

```typescript
export const usersApi = {
  me: () => apiFetch<User>("/users/me"),
  updateMe: (body) =>
    apiFetch<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  list: (params) =>
    apiFetch<PaginatedResponse<User>>(`/users?${new URLSearchParams(params)}`),
  getById: (id) => apiFetch<User>(`/users/${id}`),
  assignRole: (id, body) =>
    apiFetch<User>(`/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  setStatus: (id, isActive) =>
    apiFetch<User>(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),
  delete: (id) => apiFetch(`/users/${id}`, { method: "DELETE" }),
};
```

### Step 7.2 — Profile page (`/profile`)

Fetch: `GET /users/me`

**Shows:**

- Name, email, role badge, department, email verified status, account status
- "Edit Name" form: `name` field → `PATCH /users/me`

### Step 7.3 — Users list page (`/users`)

**Accessible to:** DEPARTMENT_HEAD+ (backend enforces this; CALL_OPERATOR and OFFICER get 403)

**Filter params:** `search` (name/email), `roleType`, `isActive`, `departmentId` (ADMIN+ only — DEPT_HEAD is auto-scoped to their department by backend)

**Table columns:** Name, Email, Role badge, Department, Status (Active/Inactive), Created At, Actions

**Actions (column):**

- "View" → `/users/:id`
- "Assign Role" button (ADMIN+)
- "Deactivate / Activate" toggle (ADMIN+)
- "Delete" button (ADMIN+)

### Step 7.4 — User detail page (`/users/[id]`)

Fetch: `GET /users/:id`

**Shows:** Full profile info.

**Assign Role (ADMIN+):**

- `roleType` select — show only roles the current user can assign (client-side filter using `ROLE_RANK`: only show roles where target rank < actor rank)
- `departmentId` select — optional, load from `GET /departments`
- Submit → `PATCH /users/:id/role`

**Set Status (ADMIN+):**

- Toggle active/inactive → `PATCH /users/:id/status` with `{ isActive: true/false }`

**Delete (ADMIN+):**

- Confirm dialog → `DELETE /users/:id`

---

## 8. Phase 7 — Departments Module

### Step 8.1 — All department API functions

```typescript
export const departmentsApi = {
  list: (params) =>
    apiFetch<PaginatedResponse<Department>>(
      `/departments?${new URLSearchParams(params)}`,
    ),
  get: (id) => apiFetch<Department>(`/departments/${id}`),
  create: (body) =>
    apiFetch<Department>("/departments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id, body) =>
    apiFetch<Department>(`/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id) => apiFetch(`/departments/${id}`, { method: "DELETE" }),
};
```

### Step 8.2 — Departments list page (`/departments`)

**Accessible to:** All authenticated users (CALL_OPERATOR+ can view)

**Table columns:** Name, Slug, SLA Hours, Status (Active/Inactive), Users Count, Complaints Count, Actions

**"New Department" button:** Visible to ADMIN+ only

**Filter:** `search`, `isActive`

### Step 8.3 — Create department (modal or `/departments/new`)

**Accessible to:** ADMIN+

**Form (map to `createDepartmentSchema`):**

- `name` — required string
- `slaHours` — optional number (default 48, sent from backend if omitted)

**Submit → `POST /departments`**

### Step 8.4 — Edit department (inline or dialog on detail page)

**Accessible to:** DEPARTMENT_HEAD+ (DEPT_HEAD can only edit their own — backend enforces)

**Fields:** `name`, `slaHours`, `isActive` (toggle)

**Submit → `PATCH /departments/:id`**

### Step 8.5 — Delete department

**Accessible to:** ADMIN+  
**Important:** Backend returns 409 if the department has active users. Show the error message as-is.

---

## 9. Phase 8 — Analytics Module

**Accessible to:** DEPARTMENT_HEAD+ (backend enforces, CALL_OPERATOR/OFFICER get 403)

### Step 9.1 — All analytics API functions

```typescript
export const analyticsApi = {
  overview: (params?) =>
    apiFetch(
      `/analytics/overview${params ? "?" + new URLSearchParams(params) : ""}`,
    ),
  trends: (params?) =>
    apiFetch(
      `/analytics/trends${params ? "?" + new URLSearchParams(params) : ""}`,
    ),
  departments: () => apiFetch("/analytics/departments"),
  officers: () => apiFetch("/analytics/officers"),
  slaHeatmap: (params?) =>
    apiFetch(
      `/analytics/sla-heatmap${params ? "?" + new URLSearchParams(params) : ""}`,
    ),
  escalationTrends: (params?) =>
    apiFetch(
      `/analytics/escalation-trends${params ? "?" + new URLSearchParams(params) : ""}`,
    ),
  categoryDistribution: () => apiFetch("/analytics/category-distribution"),
};
```

### Step 9.2 — Analytics page (`/analytics`)

Render all 7 sections on a single dashboard page with tabs or scroll sections.

#### Section 1 — Overview Cards (`GET /analytics/overview`)

Response shape:

```json
{
  "total": 243,
  "byStatus": {
    "OPEN": 40,
    "ASSIGNED": 30,
    "IN_PROGRESS": 25,
    "ESCALATED": 8,
    "RESOLVED": 100,
    "CLOSED": 40
  },
  "byPriority": { "LOW": 50, "MEDIUM": 80, "HIGH": 70, "CRITICAL": 43 },
  "sla": {
    "activeComplaints": 103,
    "breachedCount": 12,
    "breachPercentage": 11.7
  },
  "avgResolutionTime": {
    "days": 2,
    "hours": 4,
    "minutes": 30,
    "totalHours": 52.5
  },
  "resolvedCount": 100
}
```

Render as stat cards: Total, Open, Escalated, Breached (SLA), Avg Resolution Time.

#### Section 2 — Trends Chart (`GET /analytics/trends?days=30`)

- Response: array of `{ date: "2026-02-01", filed: 10, resolved: 7 }`
- Line chart with two series: Filed per day, Resolved per day
- Date range picker to change `days` param (7, 14, 30, 90)

#### Section 3 — Department Performance (`GET /analytics/departments`)

- Response: array of `{ department: { name }, total, resolved, avgResolutionTime: { totalHours } }`
- Table with columns: Department, Total, Resolved, Avg Resolution Time

#### Section 4 — Officer Leaderboard (`GET /analytics/officers`)

- Response: array of `{ officer: { name }, assigned, resolved, avgResolutionTime: { totalHours } }`
- Table with rank numbers, officer name, resolved count, avg time

#### Section 5 — SLA Heatmap (`GET /analytics/sla-heatmap`)

- Response: array per department: `{ department: { name }, total, breached, atRisk, onTrack, breachPct }`
- Render as a table or heat-coloured bar chart (red=high breach rate)

#### Section 6 — Escalation Trends (`GET /analytics/escalation-trends?days=30`)

- Response: array of `{ date, escalations: number }`
- Bar or line chart

#### Section 7 — Category Distribution (`GET /analytics/category-distribution`)

- Response: array of `{ category: string, count: number }`
- Pie chart or horizontal bar chart

---

## 10. Phase 9 — Notifications & SSE

### Step 10.1 — Notification API functions

```typescript
export const notificationsApi = {
  list: (params?) =>
    apiFetch<PaginatedResponse<Notification>>(
      `/notifications?${new URLSearchParams(params)}`,
    ),
  unreadCount: () =>
    apiFetch<{ unreadCount: number }>("/notifications/unread-count"),
  markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiFetch("/notifications/read-all", { method: "PATCH" }),
};
```

### Step 10.2 — SSE hook (`src/hooks/useNotifications.ts`)

```typescript
export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [reconnectTick, setReconnectTick] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const es = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/stream`,
      { withCredentials: true }, // REQUIRED to send auth cookie
    );

    es.addEventListener("connected", (e) => {
      const data = JSON.parse(e.data);
      setUnreadCount(data.unreadCount);
    });

    es.addEventListener("notification", (e) => {
      const notification = JSON.parse(e.data);
      setUnreadCount((c) => c + 1);
      // Invalidate the notifications list so it refreshes
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // Show a toast
      toast(notification.title, { description: notification.message });
    });

    es.addEventListener("ping", () => {
      // Keep-alive — no action needed
    });

    es.onerror = () => {
      es.close();
      // Reconnect after 5 seconds — the connected event will re-sync the unread count
      const timer = setTimeout(() => {
        // Re-trigger the effect by updating a reconnect counter in state
        setReconnectTick((t) => t + 1);
      }, 5_000);
      return () => clearTimeout(timer);
    };

    return () => es.close();
  }, [reconnectTick]); // re-run effect on reconnect tick

  return { unreadCount, setUnreadCount };
}
```

### Step 10.3 — Notification bell (TopBar)

- Show bell icon with `unreadCount` badge (hide badge if 0)
- Click → dropdown showing last 5 unread notifications with "View All" link

### Step 10.4 — Notifications page (`/notifications`)

- Fetch `GET /notifications?page=1&limit=20`
- Show paginated list: title, message, relative time, read/unread indicator
- "Mark all as read" button → `PATCH /notifications/read-all`
- Click on a notification → `PATCH /notifications/:id/read`, then navigate to the linked complaint if `complaintId` is present

---

## 11. Phase 10 — Audit Logs

**Accessible to:** ADMIN+ (backend enforces)

### Step 11.1 — API function

```typescript
export const auditLogsApi = {
  list: (params) => apiFetch(`/audit-logs?${new URLSearchParams(params)}`),
};
```

### Step 11.2 — Audit logs page (`/audit-logs`)

**Filter params:** `action`, `entityType`, `entityId`, `userId`, `from` (ISO date), `to` (ISO date)

**Table columns:** Action, Entity Type, Entity ID, Actor (userId), Timestamp, Metadata (expandable JSON)

**Filter UI:**

- Date range pickers for `from` / `to`
- `entityType` dropdown: Complaint, User, Department, Role, Notification
- `action` free-text input

---

## 12. Phase 11 — Tenant Management

**Accessible to:** SUPER_ADMIN only

### Step 12.1 — API functions

```typescript
export const tenantsApi = {
  list: (params?) =>
    apiFetch<PaginatedResponse<Tenant>>(
      `/tenants?${new URLSearchParams(params)}`,
    ),
  get: (id) => apiFetch<Tenant>(`/tenants/${id}`),
  create: (body) =>
    apiFetch<Tenant>("/tenants", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id, body) =>
    apiFetch<Tenant>(`/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deactivate: (id) => apiFetch(`/tenants/${id}`, { method: "DELETE" }),
};
```

### Step 12.2 — Tenants list page (`/tenants`)

**Table columns:** Name, Slug, Status, Users, Departments, Complaints, Created At

**"New Tenant" button** → create form

### Step 12.3 — Create tenant

**Fields:**

- `name` — required
- `slug` — optional (auto-derived from name if not provided)

**Submit → `POST /tenants`**

### Step 12.4 — Tenant detail page (`/tenants/[id]`)

Shows stats and allows editing name and activation status.

**Edit fields:** `name`, `isActive` toggle

**Deactivate button:** warning — "All users in this office will be unable to log in." → confirm → `DELETE /tenants/:id`

---

## 13. Phase 12b — Error & Fallback Pages

### Step 12b.1 — 403 Access Denied page (`src/app/(protected)/forbidden/page.tsx`)

Shown when a user navigates to a route they are not authorised to access. Create a shared component and call it from any page that gets a 403 from the API:

```typescript
// src/components/shared/AccessDenied.tsx
export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <h2 className="text-2xl font-semibold">Access Denied</h2>
      <p className="text-muted-foreground">You do not have permission to view this page.</p>
      <Button asChild><a href="/dashboard">Back to Dashboard</a></Button>
    </div>
  );
}
```

In pages, add a guard at the top using `useRole()`:

```typescript
const { isAdmin } = useRole();
if (!isAdmin) return <AccessDenied />;
```

### Step 12b.2 — 404 Not Found page (`src/app/not-found.tsx`)

Next.js renders this for unknown routes:

```typescript
// src/app/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found.</p>
      <a href="/" className="underline">Go home</a>
    </div>
  );
}
```

### Step 12b.3 — Global error boundary (`src/app/error.tsx`)

Catches unhandled runtime errors in the app router:

```typescript
// src/app/error.tsx
"use client";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Step 12b.4 — Display Zod validation errors on forms

When the API returns a 422 with `errors: [{ field, message }]`, map them to React Hook Form:

```typescript
} catch (err) {
  if (err instanceof ApiError && err.errors) {
    err.errors.forEach(({ field, message }) => {
      form.setError(field as FieldPath<FormValues>, { message });
    });
  } else {
    toast.error(err instanceof ApiError ? err.message : "An unexpected error occurred");
  }
}
```

---

## 14. Phase 12 — Public Citizen Pages

These pages require **no authentication** and must be accessible without login.

### Step 13.1 — Track page (`/track/[trackingId]`)

**What it does:** Shows the public status of a complaint.

**Fetch:** `GET /complaints/track/:trackingId`

**Response shape:**

```json
{
  "trackingId": "PCRM-20260225-A4F7B3C2",
  "citizenName": "Ramesh Kumar",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "category": "Roads",
  "createdAt": "2026-02-25T10:00:00Z",
  "updatedAt": "2026-02-26T08:00:00Z",
  "resolvedAt": null,
  "department": { "name": "Roads & Infrastructure" }
}
```

**UI:**

- Large tracking ID display
- Status badge with plain-language label (e.g. "In Progress — We are working on this")
- Department name, filed date
- Simple progress steps/indicator for the full lifecycle
- Link to feedback form if status is RESOLVED or CLOSED

### Step 13.2 — Portal / public filing page (`/portal/[tenantSlug]`)

**What it does:** Citizen files a complaint without an account.

**Fetch:** `POST /complaints/public`

**Form fields (map to `publicCreateComplaintSchema`):**

- `citizenName` — required
- `citizenPhone` — required, phone format
- `citizenEmail` — **required** (unlike staff-filed; citizen needs email to receive tracking ID + confirmation)
- `description` — required, min 10
- `category` — optional
- `priority` — optional (AI will decide if omitted)
- `departmentId` — optional, load departments for this tenant
- `tenantSlug` — hidden field from URL param

**Post-submit:** Show the tracking ID prominently. Tell the citizen to save it. Link to `/track/:trackingId`.

### Step 13.3 — Feedback page (`/feedback/[trackingId]`)

**What it does:** Citizen submits post-resolution feedback.

**Fetch:** `POST /complaints/feedback/:trackingId`

**Form fields (map to `feedbackSchema`):**

- `rating` — 1–5 star selector (integer)
- `comment` — optional textarea, max 1000

**Pre-condition:** First call `GET /complaints/track/:trackingId` to verify complaint is RESOLVED or CLOSED. If not, show "Feedback is only available after your complaint is resolved."

**Post-submit:** Thank you message.

---

## 14. Role-Based Rendering Reference

Use `hasMinimumRole(user.role, minimumRole)` for all rendering decisions:

| Feature / Action                      | Minimum Role    |
| ------------------------------------- | --------------- |
| File a complaint (staff)              | CALL_OPERATOR   |
| View complaints list                  | CALL_OPERATOR   |
| View complaint detail                 | CALL_OPERATOR   |
| Upload / view attachments             | CALL_OPERATOR   |
| View departments list                 | CALL_OPERATOR   |
| View notifications                    | CALL_OPERATOR   |
| Edit complaint (description/priority) | ADMIN           |
| Delete complaint                      | ADMIN           |
| Delete attachment                     | ADMIN           |
| Assign complaint to officer/dept      | DEPARTMENT_HEAD |
| Update complaint status               | OFFICER         |
| Add / view internal notes             | OFFICER         |
| View internal notes                   | OFFICER         |
| View users list                       | DEPARTMENT_HEAD |
| View user detail                      | DEPARTMENT_HEAD |
| Assign role / activate / delete user  | ADMIN           |
| Create / delete department            | ADMIN           |
| Edit department (name, SLA, status)   | DEPARTMENT_HEAD |
| View analytics                        | DEPARTMENT_HEAD |
| View audit logs                       | ADMIN           |
| Tenant management                     | SUPER_ADMIN     |

**Important:** These client-side checks control UI visibility only. The backend enforces the same rules independently — never rely on frontend-only gates for security.

---

## 15. API Quick Reference

| Method   | Endpoint                                    | Auth        | Description                        |
| -------- | ------------------------------------------- | ----------- | ---------------------------------- |
| `POST`   | `/auth/register`                            | Public      | Register new user                  |
| `POST`   | `/auth/verify-email`                        | Public      | Verify email with token            |
| `POST`   | `/auth/resend-verification`                 | Public      | Resend verification email          |
| `POST`   | `/auth/login`                               | Public      | Login — sets httpOnly cookies      |
| `POST`   | `/auth/refresh`                             | Cookie      | Rotate access + refresh tokens     |
| `POST`   | `/auth/logout`                              | Auth        | Logout — clears cookies            |
| `POST`   | `/auth/forgot-password`                     | Public      | Send password reset email          |
| `POST`   | `/auth/reset-password`                      | Public      | Reset password with token          |
| `GET`    | `/complaints/track/:trackingId`             | Public      | Citizen tracking lookup            |
| `POST`   | `/complaints/public`                        | Public      | Citizen self-filing                |
| `POST`   | `/complaints/feedback/:trackingId`          | Public      | Submit citizen feedback            |
| `GET`    | `/complaints`                               | Auth        | List complaints (ABAC-filtered)    |
| `POST`   | `/complaints`                               | Auth        | Create complaint (staff)           |
| `GET`    | `/complaints/:id`                           | Auth        | Get complaint detail               |
| `PATCH`  | `/complaints/:id`                           | ADMIN+      | Edit complaint                     |
| `PATCH`  | `/complaints/:id/assign`                    | DEPT_HEAD+  | Assign officer/department          |
| `PATCH`  | `/complaints/:id/status`                    | OFFICER+    | Update status                      |
| `DELETE` | `/complaints/:id`                           | ADMIN+      | Soft delete                        |
| `GET`    | `/complaints/:id/notes`                     | OFFICER+    | Get internal notes                 |
| `POST`   | `/complaints/:id/notes`                     | OFFICER+    | Add internal note                  |
| `GET`    | `/complaints/:id/attachments`               | Auth        | Get attachments (signed URLs)      |
| `POST`   | `/complaints/:id/attachments`               | Auth        | Upload files (multipart/form-data) |
| `DELETE` | `/complaints/:id/attachments/:attachmentId` | ADMIN+      | Delete attachment                  |
| `GET`    | `/complaints/:id/feedback`                  | OFFICER+    | Get citizen feedback for complaint |
| `GET`    | `/users/me`                                 | Auth        | Get own profile                    |
| `PATCH`  | `/users/me`                                 | Auth        | Update own profile (name only)     |
| `GET`    | `/users`                                    | DEPT_HEAD+  | List users                         |
| `GET`    | `/users/:id`                                | DEPT_HEAD+  | Get user detail                    |
| `PATCH`  | `/users/:id/role`                           | ADMIN+      | Assign role + department           |
| `PATCH`  | `/users/:id/status`                         | ADMIN+      | Activate / deactivate              |
| `DELETE` | `/users/:id`                                | ADMIN+      | Soft delete user                   |
| `GET`    | `/departments`                              | Auth        | List departments                   |
| `GET`    | `/departments/:id`                          | Auth        | Get department detail              |
| `POST`   | `/departments`                              | ADMIN+      | Create department                  |
| `PATCH`  | `/departments/:id`                          | DEPT_HEAD+  | Update department                  |
| `DELETE` | `/departments/:id`                          | ADMIN+      | Soft delete department             |
| `GET`    | `/analytics/overview`                       | DEPT_HEAD+  | Overview stats                     |
| `GET`    | `/analytics/trends`                         | DEPT_HEAD+  | Daily filed/resolved trends        |
| `GET`    | `/analytics/departments`                    | DEPT_HEAD+  | Per-department stats               |
| `GET`    | `/analytics/officers`                       | DEPT_HEAD+  | Officer leaderboard                |
| `GET`    | `/analytics/sla-heatmap`                    | DEPT_HEAD+  | SLA breach by department           |
| `GET`    | `/analytics/escalation-trends`              | DEPT_HEAD+  | Escalation counts over time        |
| `GET`    | `/analytics/category-distribution`          | DEPT_HEAD+  | Complaint counts by category       |
| `GET`    | `/notifications`                            | Auth        | Paginated notification list        |
| `GET`    | `/notifications/unread-count`               | Auth        | Unread count                       |
| `GET`    | `/notifications/stream`                     | Auth        | SSE stream (EventSource)           |
| `PATCH`  | `/notifications/:id/read`                   | Auth        | Mark one notification read         |
| `PATCH`  | `/notifications/read-all`                   | Auth        | Mark all notifications read        |
| `GET`    | `/audit-logs`                               | ADMIN+      | Paginated audit log                |
| `GET`    | `/tenants`                                  | SUPER_ADMIN | List tenants                       |
| `POST`   | `/tenants`                                  | SUPER_ADMIN | Create tenant                      |
| `GET`    | `/tenants/:id`                              | SUPER_ADMIN | Get tenant                         |
| `PATCH`  | `/tenants/:id`                              | SUPER_ADMIN | Update tenant                      |
| `DELETE` | `/tenants/:id`                              | SUPER_ADMIN | Deactivate tenant                  |
| `GET`    | `/health`                                   | Public      | Server health check                |

---

## Critical Implementation Notes

1. **Cookies** — All auth tokens are httpOnly cookies. Always use `credentials: "include"` on every fetch. Never read or write auth tokens in JavaScript.

2. **Token refresh** — The `apiFetch` wrapper handles silent refresh automatically. On any 401, it calls `POST /auth/refresh` once and retries. If refresh fails, redirect to `/login`.

3. **File uploads** — When uploading attachments, pass a `FormData` object as the body and do **not** set `Content-Type` header manually — the browser sets it with the correct multipart boundary.

4. **SSE with cookies** — `new EventSource(url, { withCredentials: true })` is required to send the auth cookie. Standard `EventSource` without this will be rejected as unauthenticated.

5. **Status transition** — The valid-next-status options shown to the user must match the backend's transition table exactly (listed in Step 6.4 Section E). Do not show transitions that the backend will reject.

6. **ABAC is backend-side** — Never filter complaint/user lists client-side by role. The backend already returns only what the user is allowed to see. The frontend just renders what it receives.

7. **Pagination** — All list endpoints return `{ data: [], pagination: { total, page, limit, totalPages, hasNextPage, hasPrevPage } }`. Always use `pagination.totalPages` for page controls.

8. **Rate limits** — Login is limited to 5 attempts per 15 min. When hitting a 429, show the response message directly to the user (it's human-readable).

9. **Tenant slug** — The public portal URL `/portal/[tenantSlug]` must pass `tenantSlug` in the request body to `POST /complaints/public`. The frontend gets it from the URL path.

10. **Feedback eligibility** — Only complaints with status `RESOLVED` or `CLOSED` can receive feedback. Check status before rendering the feedback form (or link to it).

---

_Backend API reference: [Backend/Readme.md](../Readme.md)_  
_Implementation internals: [Backend/docs/implementation.md](./implementation.md)_
