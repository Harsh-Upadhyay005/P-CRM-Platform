# P-CRM Platform — User Guide

> Complete feature reference for all roles. This guide explains every capability available on the platform and how to use it.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Roles Overview](#roles-overview)
3. [Public Features (No Login Required)](#public-features)
4. [Citizen / Call Operator](#citizen--call-operator)
5. [Officer](#officer)
6. [Department Head](#department-head)
7. [Admin](#admin)
8. [Super Admin](#super-admin)
9. [Common Features (All Logged-in Users)](#common-features)

---

## Getting Started

### Registration & Login

| Step | Action                                                                 |
| ---- | ---------------------------------------------------------------------- |
| 1    | Visit the platform URL and click **Register**                          |
| 2    | Fill in your name, email, password, and select your role               |
| 3    | Verify your email via the link sent to your inbox                      |
| 4    | Log in with your credentials                                           |
| 5    | If you forget your password, use **Forgot Password** on the login page |

> **Email Verification**: If you did not receive the email, go to `/resend-verification` to request a new one.

---

## Roles Overview

| Role                | Who Is This For                  | Key Capability                                            |
| ------------------- | -------------------------------- | --------------------------------------------------------- |
| **Super Admin**     | Platform owner / top-level admin | Full control — manage tenants, all users, all data        |
| **Admin**           | Organisation administrator       | Manage users, departments, complaints within their tenant |
| **Department Head** | Head of a government department  | Manage their department's complaints + analytics          |
| **Officer**         | Field/desk officer               | Handle assigned complaints, add notes                     |
| **Call Operator**   | Helpdesk / call-centre staff     | Create complaints on behalf of citizens                   |

---

## Public Features

No login required.

### Complaint Tracking Page (`/track/:trackingId`)

Citizens can check the real-time status of their complaint without signing in.

1. Visit `/track` and enter the **Tracking ID** (e.g., `CMP-2026-00123`)
2. The page shows:
   - Current status (Open → Assigned → In Progress → Resolved / Closed)
   - Assigned department & officer
   - Status history timeline
   - Citizen feedback form (once the complaint is **Resolved/Closed**)
3. Citizens can leave a **star rating (1–5)** and a comment after resolution

---

## Citizen / Call Operator

> Call Operators log in and file complaints **on behalf of citizens**.

### Filing a New Complaint

1. Navigate to **Complaints → New Complaint** (or click the **+ New** button on the dashboard)
2. Fill in the required fields:
   - **Citizen Name** and **Phone Number** (required)
   - **Citizen Email** (optional)
   - **Department** — select the responsible department
   - **Priority** — Low / Medium / High / Critical
   - **Description** — detailed description of the complaint
3. Click **Submit Complaint**
4. The system will:
   - Auto-generate a unique **Tracking ID**
   - Run **AI categorisation** and **priority scoring** in the background
   - Send the tracking ID to the citizen's email (if provided)

### Viewing Complaints

- Go to **Complaints** in the sidebar
- Use the **search bar** to find by Tracking ID or citizen name
- Filter by **Status**, **Priority**, or **Department**
- Click any row to open the **Complaint Detail** page

### Complaint Detail Page

| Section        | What You Can Do                                       |
| -------------- | ----------------------------------------------------- |
| Description    | View full description, AI category, and AI score      |
| Status History | See the full chronological status timeline            |
| Notes          | Read existing notes; add a new internal note          |
| Attachments    | Upload files; download or delete existing attachments |
| Citizen Info   | View citizen name, phone, email                       |
| Assignment     | See which department/officer is handling it           |
| Tracking       | Copy tracking ID; open the public tracking page       |
| Feedback       | View citizen rating and comment (if submitted)        |

---

## Officer

Officers receive/assigned complaints and are responsible for resolving them.

### Handling Assigned Complaints

1. Open **Complaints** — your assigned complaints appear at the top
2. Open a complaint and review the **Description** and **Notes**
3. **Add Notes** to document your progress (visible to admins/heads)
4. **Upload Attachments** (evidence, photos, documents)
5. **Update Status** using the **Update Status** button:
   - `OPEN` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`
   - Optionally add a note explaining the status change

### Dashboard

Officers see a **personal dashboard** with:

- KPI cards: total assigned, in-progress, resolved counts
- **Complaint Manager** widget: table and Kanban board views
- **SLA Timer** on each complaint card — turns red as the deadline approaches

---

## Department Head

In addition to everything an Officer can do, Department Heads have:

### Department Analytics

Navigate to **Analytics** to see your department's performance:

| Tab                 | What It Shows                                            |
| ------------------- | -------------------------------------------------------- |
| **Overview**        | Total, Open, Resolved, SLA Breached, Escalated counts    |
| **Trends**          | Filed vs. Resolved complaints over 7 / 14 / 30 / 90 days |
| **Departments**     | Bar chart — Total and Resolved per department            |
| **Officers**        | Officer leaderboard: assigned, resolved, SLA compliance  |
| **SLA Breach Rate** | Breach % per department (horizontal bar chart)           |
| **Escalations**     | Escalation trend line chart over time                    |
| **Categories**      | Bar/Pie chart of complaint volume by category            |

### Managing Complaints (Dept Head Scope)

- **Assign** a complaint to any officer within the department
- **Update Status** on any complaint in their department
- Full read access to all notes and attachments

---

## Admin

Admins manage all users and departments within their tenant.

### User Management (`/users`)

| Action                  | How                                                                            |
| ----------------------- | ------------------------------------------------------------------------------ |
| View all users          | Navigate to **Users** page                                                     |
| Search & filter         | Use the search bar and Role/Status filters                                     |
| Create a user           | Click **+ Add User** → fill in name, email, role, department, password         |
| Edit a user             | Click the **⋮** menu → **Edit** → change name, role, department, active status |
| Deactivate / reactivate | Toggle the active status in the edit dialog                                    |
| Delete a user           | Click the **⋮** menu → **Delete**                                              |

> Deleted users are soft-deleted and cannot log in.

### Department Management (`/departments`)

| Action                 | How                                                      |
| ---------------------- | -------------------------------------------------------- |
| View all departments   | Navigate to **Departments** page                         |
| Create department      | Click **+ Add Department** → enter name, slug, SLA hours |
| Edit department        | Click **⋮** → **Edit** → update name, slug, SLA hours    |
| Toggle active/inactive | Click **⋮** → **Deactivate / Activate**                  |
| Delete department      | Click **⋮** → **Delete**                                 |

> **SLA Hours** — complaints in this department will breach SLA if unresolved past this many hours.

### Complaint Management

- Admins can view, assign, update, and **permanently delete** any complaint
- The **Delete** button appears on the Complaint Detail page (Admin only)

### Audit Logs (`/audit-logs`)

Track every system event:

- Filter by **Action type**, **Entity type**, **User**, **Date range**
- See who performed each action, from which IP address, and when

---

## Super Admin

Super Admins have **full platform control** across all tenants.

### Tenant Management (`/tenants`)

| Action           | How                                          |
| ---------------- | -------------------------------------------- |
| View all tenants | Navigate to **Tenants** page                 |
| Create tenant    | Click **+ Add Tenant** → enter name and slug |
| Edit tenant      | Click **⋮** → **Edit**                       |
| Toggle active    | Click **⋮** → **Deactivate / Activate**      |
| Delete tenant    | Click **⋮** → **Delete**                     |

> Each tenant is fully isolated — users, departments, complaints, and analytics are scoped per tenant.

### Cross-Tenant Access

- Super Admins can see users, complaints, analytics, and audit logs across **all tenants**
- All analytics charts and KPI cards aggregate data across the entire platform

---

## Common Features

Available to every logged-in user.

### Profile Page (`/profile`)

- View your name, email, department, role, and account status
- **Edit your name** inline — click the pencil icon, type a new name, press Enter or click ✓
- **Sign Out** — click the red Sign Out button at the bottom

### Notifications (`/notifications`)

- **Real-time updates** via Server-Sent Events (SSE) — new notifications appear instantly without refreshing
- Each notification shows title, message, and time ago
- **Mark one as read** — hover a notification and click the ✓ button
- **Mark all as read** — click the **Mark all read** button in the top-right
- **Pagination** — load older notifications with Prev / Next

### Dashboard (`/dashboard`)

| Widget                | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| **KPI Cards**         | Total, Open, In Progress, Resolved, SLA Breached, Escalated counts |
| **Trends Chart**      | 30-day area chart of Filed vs. Resolved                            |
| **Category Chart**    | Bar/Pie chart of category distribution                             |
| **Complaint Manager** | Interactive table and Kanban board with search and filters         |
| **Team Performance**  | Officer cards showing assigned, resolved, pending, SLA compliance  |

---

## Key Concepts

### SLA (Service Level Agreement)

Each department has an **SLA deadline** (in hours). If a complaint is not resolved within that time:

- The **SLA timer** on complaint cards turns red
- The complaint is counted as **SLA Breached** in analytics
- Breached complaints are flagged in the department's SLA Breach Rate chart

### AI Features

When a complaint is submitted:

- **Auto-categorisation** — AI assigns a category based on the description
- **Priority scoring** — AI scores the urgency (0.0–1.0); used to flag high-priority items
- **Sentiment analysis** — AI scores the citizen's sentiment; negative sentiment may trigger escalation
- **Duplicate detection** — AI compares with existing complaints to detect duplicates

### Escalation

A complaint transitions to **ESCALATED** status when:

- It is manually escalated by an Admin/Officer
- AI sentiment score is critically negative (automatic escalation)

Escalated complaints are visible in the **Escalations** analytics tab.

---

## Quick Reference — Status Lifecycle

```
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                      ↓
                  ESCALATED → IN_PROGRESS → RESOLVED → CLOSED
```

| Status          | Meaning                                        |
| --------------- | ---------------------------------------------- |
| **OPEN**        | Just filed, not yet assigned                   |
| **ASSIGNED**    | Assigned to a department/officer               |
| **IN_PROGRESS** | Officer is actively working on it              |
| **ESCALATED**   | Escalated due to urgency or failure to resolve |
| **RESOLVED**    | Issue addressed; awaiting citizen confirmation |
| **CLOSED**      | Fully closed; citizen feedback accepted        |

---

## Quick Reference — Priority Levels

| Priority     | When to Use                                           |
| ------------ | ----------------------------------------------------- |
| **LOW**      | Minor inconvenience, no urgency                       |
| **MEDIUM**   | Standard complaint needing attention                  |
| **HIGH**     | Significant impact; resolve quickly                   |
| **CRITICAL** | Emergency / life-safety; immediate attention required |

---

_Last updated: February 2026_
