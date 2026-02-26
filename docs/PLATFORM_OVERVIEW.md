# P-CRM Platform — Product Overview

> **Political CRM: Smart Grievance Management for Modern Government**

---

## What Is P-CRM?

P-CRM is a **full-stack digital grievance management platform** built specifically for government offices and political constituencies. It replaces paper registers, spreadsheets, and fragmented WhatsApp chains with a single, structured, accountable system where every citizen complaint is received, tracked, assigned, escalated, and resolved — with a complete audit trail and zero information falling through the cracks.

Citizens submit complaints. Staff action them. Leaders see the real picture. Every step is recorded.

---

## The Problem We Solve

### How Grievance Management Works Today (and Why It Fails)

| Pain Point                         | Reality                                                        |
| ---------------------------------- | -------------------------------------------------------------- |
| Complaints come in from everywhere | WhatsApp, phone, in-person, letters — no single record         |
| No accountability                  | Nobody knows who was supposed to act, or by when               |
| No visibility for leadership       | Officials have no real-time view of what is pending or overdue |
| No SLA enforcement                 | Deadlines are informal — missed routinely with no consequence  |
| Duplicate complaints waste time    | Same pothole gets filed 20 times, processed 20 times           |
| Citizens stay in the dark          | No tracking, no updates, no closure                            |
| Data lives in people, not systems  | When a staff member leaves, knowledge leaves with them         |

**The result:** Citizens lose trust. Complaints pile up. Leaders face embarrassment. Staff get blamed with no data to defend themselves.

---

## What P-CRM Offers

### A Complete Lifecycle for Every Complaint

```
Citizen submits  →  Staff receives  →  Dept assigned  →  Officer works  →  Resolved
      ↓                   ↓                  ↓                ↓                ↓
 Tracking ID         Notification       SLA clock         Progress         Citizen
 issued instantly    pushed to staff    starts ticking     notes logged     notified
```

No complaint is lost. No deadline is invisible. No step is undocumented.

---

## Core Capabilities

### 1. Multi-Channel Complaint Intake

- **Public portal** — Citizens file complaints without creating an account. They receive a unique tracking ID (`PCRM-20260225-A4F7B3C2`) instantly.
- **Staff filing** — Call centre operators and front-desk staff log complaints on behalf of citizens who call or walk in.
- **Tracking without login** — Any citizen can check the status of their complaint at any time using their tracking ID alone. No app download, no account required.
- **Search** — Staff can full-text search across tracking IDs, citizen names, phone numbers, and complaint descriptions in a single query.

**Benefit for Government:** Complaints are captured regardless of channel. No complaint is lost at intake. Citizens feel heard from the first moment.

---

### 2. Intelligent Priority Detection (AI Layer)

Every new complaint is automatically analysed by three built-in AI engines — no external API, no subscription cost:

| Engine                  | What It Detects                                              | Why It Matters                                                                                             |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Priority Prediction** | CRITICAL / HIGH / MEDIUM / LOW based on description content  | A water supply failure automatically ranks higher than a broken bench — no manual re-prioritisation needed |
| **Sentiment Analysis**  | How distressed or urgent the citizen's tone is               | Angry, distressed reports surface faster for human review                                                  |
| **Duplicate Detection** | Whether a complaint is substantially similar to a recent one | Flags duplicate submissions for staff review — saves officer time, gives leadership more accurate counts   |

**Benefit for Government:** Critical complaints — burst pipes, safety hazards, health emergencies — are automatically elevated. Staff focus their energy on what actually matters most, not just what arrived first.

---

### 3. Department & Officer Assignment with Scope Enforcement

Complaints are routed to the responsible department and assigned to a specific officer. The system enforces:

- A **Department Head can only assign within their own department** — no cross-department interference
- An **Officer only sees complaints assigned to them** — no information overload, no confusion
- Assignment automatically moves the complaint to `ASSIGNED` status and notifies the officer in real time

**Benefit for Government:** Clear ownership from the moment a complaint moves forward. No officer can claim they "didn't see it." No department can push work across boundaries without authorisation.

---

### 4. Structured Status Lifecycle

Every complaint moves through a defined, role-gated workflow:

```
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                        ↘
                     ESCALATED → ASSIGNED / IN_PROGRESS
```

- **No status can be skipped.** A complaint cannot jump from OPEN to CLOSED.
- **Role-based permissions.** An Officer can mark a complaint IN_PROGRESS or RESOLVED. Only a Department Head or Admin can escalate. The system enforces this — no workarounds.
- **Every transition is recorded.** Who changed what status, when — immutable audit history.

**Benefit for Government:** A complete, court-admissible chronological record of every action taken on every complaint. Accountability cannot be disputed.

---

### 5. SLA (Service Level Agreement) Monitoring

Each department has a configurable response deadline (default: 48 hours). The system:

| SLA State          | When It Triggers                 | Action                                                                |
| ------------------ | -------------------------------- | --------------------------------------------------------------------- |
| **On Track**       | < 75% of deadline elapsed        | Nothing — complaint is progressing normally                           |
| **Warning**        | ≥ 75% of deadline elapsed        | Visual indicator — staff can see it is at risk                        |
| **Breached**       | Deadline passed                  | Automated email alert to the filing staff member and assigned officer |
| **Auto-Escalated** | Background job runs every 30 min | Complaint status automatically moved to ESCALATED                     |

**Benefit for Government:** SLAs are enforced by the system, not by memory. Leadership does not have to chase departments — breaches escalate themselves. This creates a measurable, defensible performance record.

---

### 6. Real-Time Notifications

Every relevant staff member receives instant in-app notifications — no refreshing, no polling:

- Officer assigned to a complaint → notified immediately
- Complaint status changes → creator and officer notified
- SLA breach → email alert dispatched automatically

Notifications are delivered via **Server-Sent Events (SSE)** — meaning the dashboard updates live the moment something happens, visible on any open browser tab.

**Benefit for Government:** Staff are always aware of what requires their attention. Nothing waits in a queue nobody checks.

---

### 7. File Attachments

Complainants and officers can attach evidence — photos of a broken road, scanned documents, site reports — directly to the complaint. Files are stored securely in cloud storage with time-limited access links. No permanent public exposure.

**Benefit for Government:** Evidence is tied to the complaint record permanently. Officers can see the problem before they visit. Disputes are resolved with documented evidence.

---

### 8. Internal Notes

Officers and department heads can add internal staff notes to complaints — notes that are never shown to citizens. These capture field observations, coordination details, and internal decisions.

**Benefit for Government:** Staff communication is centralised inside the complaint record. No more parallel WhatsApp threads that disappear when a staff member changes their phone.

---

### 9. Citizen Feedback & Satisfaction Rating

After a complaint is resolved, the citizen can submit a satisfaction rating (1–5) and a comment using only their tracking ID — no login required. This data is available to staff and management.

**Benefit for Government:** Objective, citizen-reported data on service quality. Not what the office thinks it delivered — what the citizen actually experienced. Directly actionable for improvement.

---

### 10. Executive Analytics Dashboard

Leadership and department heads have access to seven live analytics views, all scoped to their authority level:

| Report                     | What It Shows                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------- |
| **Overview**               | Total complaints by status and priority, average resolution time, SLA breach count |
| **Trends**                 | Daily complaint volume and resolution volume over any date range                   |
| **Department Performance** | Open vs resolved counts and average resolution time per department                 |
| **Officer Leaderboard**    | Who is resolving the most, and how fast                                            |
| **SLA Heatmap**            | Breach rate by department and priority — where the systemic failures are           |
| **Escalation Trends**      | Are escalations going up or down over time?                                        |
| **Category Distribution**  | Which complaint types are most common                                              |

**Benefit for Government:** Real data to answer real questions. Which department is underperforming? Which complaint type is increasing? Is the office getting faster or slower? No more guessing.

---

### 11. Complete Audit Trail

Every complaint carries a full, immutable status history — every transition (who changed what status, from what, to what, at what time) is written atomically to the database at the moment it happens. A separate structured audit log API is available to platform administrators for querying user and system actions by entity, actor, action type, and date range.

**Benefit for Government:** If a complaint was mishandled, improperly closed, or suspiciously fast-tracked, the status history provides an irrefutable chronological record of every action taken. Protects both citizens and legitimate staff from disputed claims.

---

### 12. Multi-Office (Multi-Tenant) Architecture

P-CRM is designed to serve multiple political offices or government units from a single deployment. Each office operates in a completely isolated data environment — one office cannot see or affect another's data.

**Benefit for Government:** A single platform can be operated centrally (e.g. by a state IT department) while serving dozens of district offices, constituencies, or departments — each with full data isolation and independent configuration.

---

## Who Uses P-CRM

| Role                | Who They Are                         | What They Do                                                               |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| **Call Operator**   | Front-desk staff, call centre agents | Log complaints, track them by ID                                           |
| **Officer**         | Field officers, resolution staff     | Action complaints assigned to them, update status, add notes               |
| **Department Head** | HOD, section chief                   | Assign complaints within department, view department analytics, manage SLA |
| **Admin**           | Office administrator, IT manager     | Full office management — users, departments, all complaints                |
| **Super Admin**     | Central IT / platform operator       | Cross-office management, tenant provisioning, platform-wide audit          |

---

## End-to-End Workflow Walkthroughs

### Workflow 1 — Citizen Files a Complaint (Public Channel)

```
1. Citizen visits the public complaint portal
2. Fills in: name, phone, email (optional), description, category
3. Submits — no account required
4. System:
   a. Assigns unique Tracking ID (PCRM-20260225-A4F7B3C2)
   b. Runs AI analysis → sets priority score + sentiment score
   c. Creates complaint with status: OPEN
5. Citizen receives tracking ID — can check status anytime at /track/{id}
6. Call Operator / Admin sees new complaint on dashboard (live SSE notification)
```

---

### Workflow 2 — Complaint Assignment & Routing

```
1. Admin or Department Head opens the complaint
2. Selects target department and responsible officer
3. System enforces:
   - Officer must belong to the assigned department (if actor is Dept Head)
   - Officer must be in the same tenant
4. Status automatically moves: OPEN → ASSIGNED
5. Officer receives instant in-app notification + email
6. SLA clock starts running from the original complaint creation time
```

---

### Workflow 3 — Officer Works the Complaint

```
1. Officer sees complaint in their dashboard (filtered: only their assignments)
2. Opens complaint — sees full description, attachments, AI score, SLA status
3. Updates status to IN_PROGRESS (moves to field / begins resolution)
4. Adds internal note: "Visited site. Pipe burst confirmed. Plumber dispatched."
5. Optionally uploads photo evidence as attachment
6. On completion: updates status to RESOLVED
7. System:
   a. Records resolvedAt timestamp
   b. Notifies complaint creator (staff who filed it)
   c. Stops SLA clock
```

---

### Workflow 4 — SLA Breach & Auto-Escalation

```
1. Complaint assigned to Sanitation Dept (SLA: 48 hours)
2. 38 hours pass — SLA state becomes WARNING (visible on dashboard)
3. No action taken
4. 48 hours pass — SLA BREACHED
5. Background job runs (every 30 minutes):
   a. Detects breach
   b. Moves status to ESCALATED
   c. Records status history entry
   d. Sends breach alert email to:
      - Staff member who originally filed the complaint
      - Assigned Officer (if any)
6. Department Head sees escalated complaint with full history
7. Assigns to senior officer or resolves directly
```

---

### Workflow 5 — Leadership Reviews Performance

```
1. Admin logs into analytics dashboard
2. Views Overview: 243 complaints this month, 31 SLA breached, avg resolution 52h
3. Opens SLA Heatmap: Roads department has 67% breach rate on HIGH priority
4. Opens Officer Leaderboard: Officer Sharma resolved 28 complaints this month (fastest)
5. Opens Escalation Trends: escalations up 15% in last 2 weeks
6. Takes action: meets with Roads department head, sets new process
7. Reviews again in 2 weeks — data shows improvement or confirms the problem persists
```

---

### Workflow 6 — Citizen Tracks & Gives Feedback

```
1. Citizen enters tracking ID at /track/PCRM-20260225-A4F7B3C2
2. Sees: status RESOLVED, resolved on 2026-02-24, department: Water & Sanitation
3. Receives prompt: "Was your issue resolved? Rate our service."
4. Submits: 4 stars, comment "Fixed but took longer than expected"
5. Feedback stored against complaint — visible to staff and management
6. Appears in analytics: avg citizen satisfaction score for Water dept = 3.8/5
```

---

## Security & Data Protection

| Concern                      | How P-CRM Addresses It                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthorised access          | JWT tokens expire in 15 minutes. Compromised tokens are immediately blacklisted via Redis.                                                                                |
| Data leakage between offices | Every database query is scoped to the logged-in user's office (tenant). Technical isolation — not just policy.                                                            |
| Staff seeing others' work    | Role-scoped data filters — Officers see only their assignments, Dept Heads see only their department                                                                      |
| Brute force login attacks    | Rate limiting: 5 login attempts per 15 minutes per IP                                                                                                                     |
| Token theft                  | Both tokens stored in httpOnly cookies — inaccessible to JavaScript                                                                                                       |
| Sensitive data exposure      | Passwords, tokens, reset codes never appear in API responses                                                                                                              |
| File exposure                | Attachment download links expire after 1 hour                                                                                                                             |
| Audit gaps                   | Every complaint status transition is written atomically to an immutable status history with actor ID and timestamp. Structured audit log API available for admin queries. |

---

## Why P-CRM vs a Generic Helpdesk Tool

| Feature                        | Generic Helpdesk                | P-CRM                                                                          |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------ |
| Multi-office isolation         | Rarely, or paid enterprise tier | Built in from the ground up                                                    |
| Government role hierarchy      | Generic agent/admin only        | 5-level political office hierarchy (Officer → Dept Head → Admin → Super Admin) |
| SLA auto-escalation            | Manual rules only               | Automated background escalation engine                                         |
| AI priority detection          | Add-on, external API cost       | Included, runs locally, no API cost                                            |
| Citizen tracking without login | Not standard                    | Core feature, no account needed                                                |
| Political office workflows     | Not understood                  | Designed specifically for this context                                         |
| Audit trail quality            | Basic logs                      | Immutable, structured, queryable by any field                                  |
| Department-scoped assignment   | Not standard                    | Enforced in code — cannot be bypassed                                          |
| Duplicate detection            | Not standard                    | Built-in TF cosine similarity engine                                           |

---

## Deployment & Integration

- **Deployment**: Node.js backend deployable on any cloud (AWS, Azure, GCP, DigitalOcean, on-premises)
- **Database**: PostgreSQL — widely supported, government-approved in most jurisdictions
- **Frontend**: Next.js — works in any modern browser, no mobile app required
- **Email**: Brevo SMTP integration — swappable for any SMTP provider
- **File storage**: Supabase Storage (S3-compatible) — swappable for AWS S3 or any S3-compatible store
- **No vendor lock-in**: All infrastructure components are replaceable

---

## Summary

P-CRM gives government offices the infrastructure to:

1. **Never lose a complaint** — every submission captured, timestamped, and tracked
2. **Eliminate manual SLA tracking** — system enforces and escalates automatically
3. **Give citizens real transparency** — live status, tracking IDs, satisfaction feedback
4. **Give leadership real data** — not reports prepared by the subject, but live system-generated analytics
5. **Create an accountability culture** — every action is recorded, every role is scoped, every breach is visible
6. **Scale across offices** — one platform for an entire state, each office fully isolated

The platform is not a pilot or an experiment. It is a production-grade system built with the same standards as commercial enterprise software — security hardening, graceful failure handling, and a data architecture designed to scale to hundreds of thousands of complaints per tenant.

---

_For technical integration details, see [Backend/Readme.md](../Readme.md)_
_For implementation internals, see [Backend/docs/implementation.md](./implementation.md)_
