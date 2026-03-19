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

| Step | Action                                                                                      |
| ---- | ------------------------------------------------------------------------------------------- |
| 1    | Visit the platform URL and click **Register**                                               |
| 2    | Fill in your name, email, and password, then **select your organisation** from the dropdown |
| 3    | Verify your email via the link sent to your inbox                                           |
| 4    | Log in with your credentials — an Admin will assign your role after first login             |
| 5    | If you forget your password, use **Forgot Password** on the login page                      |

> **Email Verification**: If you did not receive the email, go to `/resend-verification` to request a new one.

---

## Roles Overview

| Role                | Level | Scope                        | Who Is This For                  |
| ------------------- | ----- | ---------------------------- | -------------------------------- |
| **Super Admin**     | 5     | Full platform (all tenants)  | Platform owner / top-level admin |
| **Admin**           | 4     | Full tenant access           | Organisation administrator       |
| **Department Head** | 3     | Own department only          | Head of a government department  |
| **Officer**         | 2     | Own assigned complaints only | Field/desk officer               |
| **Call Operator**   | 1     | Own created complaints only  | Helpdesk / call-centre staff     |

### Permission Matrix

| Action                                 | Super Admin | Admin |   Dept Head   | Officer | Call Operator |
| -------------------------------------- | :---------: | :---: | :-----------: | :-----: | :-----------: |
| Manage tenants                         |     ✅      |  ❌   |      ❌       |   ❌    |      ❌       |
| Manage all users (all tenants)         |     ✅      |  ❌   |      ❌       |   ❌    |      ❌       |
| Manage users within tenant             |     ✅      |  ✅   |      ❌       |   ❌    |      ❌       |
| Create / edit / deactivate departments |     ✅      |  ✅   |      ❌       |   ❌    |      ❌       |
| View all complaints (tenant scope)     |     ✅      |  ✅   |      ❌       |   ❌    |      ❌       |
| View dept complaints only              |     ✅      |  ✅   |      ✅       |   ❌    |      ❌       |
| View own assigned complaints           |     ✅      |  ✅   |      ✅       |   ✅    |      ❌       |
| View own created complaints            |     ✅      |  ✅   |      ✅       |   ✅    |      ✅       |
| Assign complaint to any dept/officer   |     ✅      |  ✅   |      ❌       |   ❌    |      ❌       |
| Assign within own department only      |     ✅      |  ✅   |      ✅       |   ❌    |      ❌       |
| Set status ASSIGNED                    |     ✅      |  ✅   |      ✅       |   ❌    |      ❌       |
| Set status IN_PROGRESS                 |     ✅      |  ✅   |      ✅       |   ✅    |      ❌       |
| Set status RESOLVED                    |     ✅      |  ✅   |      ✅       |   ✅    |      ❌       |
| Set status ESCALATED                   |     ✅      |  ✅   |      ✅       |   ❌    |      ❌       |
| Set status CLOSED                      |     ✅      |  ✅   |      ❌       |   ❌    |      ❌       |
| Add internal notes                     |     ✅      |  ✅   |      ✅       |   ✅    |      ❌       |
| Submit feedback on own complaint       |     ✅      |  ✅   |      ✅       |   ✅    |      ✅       |
| View analytics                         |     ✅      |  ✅   | ✅ (own dept) |   ❌    |      ❌       |
| Export complaints CSV                  |     ✅      |  ✅   |      ✅       |   ❌    |      ❌       |
| View audit logs                        |     ✅      |  ✅   |      ❌       |   ❌    |      ❌       |
| Access other tenants' data             |     ✅      |  ❌   |      ❌       |   ❌    |      ❌       |

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

> Satisfaction feedback is submitted from the **complaint detail page** inside the dashboard, not here. Only the staff member who originally filed the complaint can submit feedback once it is Resolved or Closed.

---

## Citizen / Call Operator

> Call Operators log in and file complaints **on behalf of citizens**.

### Filing a New Complaint

1. Navigate to **Complaints → New Complaint** (or click the **+ New** button on the dashboard)
2. Fill in the required fields:
   - **Citizen Name** and **Phone Number** (required)
   - **Citizen Email** (optional — used to send the tracking ID)
   - **Locality / Area** (optional) — the specific neighbourhood or area, e.g. `Lanka, Varanasi`. Helps the system route the complaint correctly and prevents duplicates from different localities being merged.
   - **Department** — optionally select the responsible department; leave blank to let the AI auto-route
   - **Priority** — Low / Medium / High / Critical (leave blank for AI auto-detection)
   - **Description** — detailed description of the complaint (required)
   - **Attachments** — photos, PDFs, or documents (optional, max 5 files)
3. Click **Submit Complaint**
4. The system will:
   - Auto-generate a unique **Tracking ID**
   - Run **AI categorisation** and **priority scoring** in the background
   - Send the tracking ID to the citizen's email (if provided)

### Viewing Complaints

- Go to **Complaints** in the sidebar
- Use the **search bar** to find by Tracking ID or citizen name
- Filter by **Status** — All / Open / Assigned / In Progress / Escalated / Resolved / Closed
- Filter by **Priority** — All / Low / Medium / High / Critical
- Filter by **Department** — select any active department from the dropdown
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

### Submitting Feedback

Once a complaint you filed reaches **Resolved** or **Closed** status:

1. Open the complaint from the **Complaints** list
2. Scroll to the **Feedback** section in the right sidebar
3. Select a **star rating (1–5)**
4. Optionally add a comment (e.g. `“Fixed but took 3 days”`)
5. Click **Submit Feedback**

> Only the user who originally filed the complaint can see and submit the feedback form. Once submitted, the feedback is stored permanently against the complaint and is visible to staff and management.

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

Click the **Export CSV** button on any analytics tab to download the report as a spreadsheet.

### Managing Complaints (Dept Head Scope)

- **Assign** a complaint to any officer within the department
- **Update Status** on any complaint in their department
- Full read access to all notes and attachments

---

## Admin

Admins manage all users and departments within their tenant.

### User Management (`/users`)

| Action                  | How                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| View all users          | Navigate to **Users** page                                                                             |
| Search & filter         | Use the search bar and Role/Status filters                                                             |
| Email verification      | A green ✓ next to the email means verified; an amber ⏱ means the user has not yet verified their email |
| Create a user           | Click **+ Add User** → fill in name, email, role, department, password                                 |
| Change role / dept      | Click the **⋮** menu → **Change Role** → select new role and department                                |
| Deactivate / reactivate | Click the **⋮** menu → **Deactivate / Activate**                                                       |
| Delete a user           | Click the **⋮** menu → **Delete**                                                                      |

> **Admin-created users**: When you create a user via the **+ Add User** button, their email is automatically verified — they can log in immediately without needing to check their inbox.

> Deleted users are soft-deleted and cannot log in.

### Department Management (`/departments`)

| Action                      | How                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| View all departments        | Navigate to **Departments** page                                                                                   |
| Create department           | Click **+ New Department** → enter name, SLA hours, and service areas                                              |
| Edit department             | Click **⋮** → **Edit** → update name, SLA hours, or service areas                                                  |
| Toggle active/inactive      | Click **⋮** → **Edit** → toggle the Active switch                                                                  |
| Delete department           | Click **⋮** → **Delete**                                                                                           |
| View & manage members       | Click the **Members** button on any department card                                                                |
| Assign user to department   | Open **Members** dialog → pick a user from the dropdown → **Assign**                                               |
| Remove user from department | Open **Members** dialog → click the **×** icon next to the user                                                    |
| Designate a department head | Open **Members** dialog → use the **Role** dropdown next to the user → select **Department Head** → click **Save** |

> **SLA Hours** — complaints in this department will breach SLA if unresolved past this many hours.

> **Service Areas** — ward/area/block names that this department covers (e.g. `BHU, Varanasi`, `Durga Kund, Varanasi`). Type an area name and press **Enter** or click **Add** to add it; click the **×** on any tag to remove it. Displayed on the department card and used to help operators route complaints geographically.

> **Department Head** — only one user per department should hold the `DEPARTMENT_HEAD` role. Promoting a new head via the Members dialog automatically changes that user's role. The head badge is shown on the Members dialog for easy identification.

> **Assigning users to departments from the Users page** is also supported via **⋮ → Change Role**: select the role and then pick the department from the dropdown.

### Workflow Automation (`/workflow`)

Admins and Super Admins can configure the automation engine from the **Workflow** page.

#### A. Workflow Settings

| Setting               | Meaning                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| Smart Routing Enabled | Uses AI + department service metadata to auto-route unassigned complaints |
| Auto Close Enabled    | Closes resolved complaints after configured no-feedback days              |
| Auto Close After Days | Number of days to wait before auto-closing                                |

#### B. Assignment Rules

Use **New Rule** to create priority-ordered automation rules.

Rule inputs:

- **Rule Priority** (lower runs first)
- **Category patterns** (comma-separated)
- **Area patterns** (comma-separated)
- **Keyword patterns** (comma-separated)
- Optional **Department action**
- Optional **Assignee action**
- Optional **Priority override**
- **Stop on match** toggle

#### C. Category SLA Policies

Define SLA by category directly from Workflow page.

Examples:

- `Water` → `24h`
- `Road` → `72h`

SLA evaluation order:

1. Category SLA policy
2. Department SLA
3. Platform default (48h)

This SLA is used consistently in complaint cards, SLA breach filters, escalation jobs, and analytics.

### Complaint Management

- Admins can view, assign, update, and **permanently delete** any complaint within their tenant
- Use the **Status**, **Priority**, and **Department** filters on the Complaints list to narrow down
- Click **Export CSV** to download all filtered complaints (up to 10,000 rows) as a spreadsheet
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
- **Change password** — click **Change Password**, enter your current password and a new one (min. 8 characters), confirm and save
- **Sign Out** — click the red Sign Out button at the bottom

> Note: If you were created by an Admin, your email is pre-verified and you can log in and change your password immediately.

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

_Last updated: March 2026_
