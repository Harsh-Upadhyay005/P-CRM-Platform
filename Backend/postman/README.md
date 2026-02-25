# P-CRM API Testing Guide

> **Fill in your credentials** in the `P-CRM Local` Postman environment after importing.
> Never commit real passwords to Git.

---

Two files to import into Postman:

| File                                   | Purpose                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `P-CRM.postman_collection.json`        | All 54+ API requests with automated pass/fail tests         |
| `P-CRM-Local.postman_environment.json` | Environment variables (base URL, credentials, captured IDs) |

---

## STEP 1 — Set up the database (do this ONCE)

First, open your `.env` file and add these two lines with your actual credentials:

```env
SEED_SUPER_ADMIN_EMAIL=your_email@example.com
SEED_SUPER_ADMIN_PASSWORD=YourPassword
```

Then open a terminal in the `Backend` folder and run:

```bash
npm install
npx prisma db push
node prisma/seed.js
```

You should see:

```
Roles seeded
Tenant 'main-office' seeded with Super Admin
Seeding completed successfully
```

> If it says `Tenant 'main-office' already exists` — that is fine, keep going.

---

## STEP 2 — Start the backend server

In the `Backend` folder, run:

```bash
npm run dev
```

You should see:

```
Server running on port 5000
Database connected
```

**Keep this terminal open the whole time you test.**

---

## STEP 3 — Set up Postman

1. Download Postman from **https://www.postman.com/downloads/** if you don't have it
2. Open Postman → click **Import** (top-left button)
3. Import BOTH files from the `Backend/postman/` folder:
   - `P-CRM.postman_collection.json`
   - `P-CRM-Local.postman_environment.json`
4. In the top-right corner, click the dropdown that says **"No Environment"** and select **P-CRM Local**

> After importing, open **P-CRM Local** in Postman and fill in your `superAdminEmail` and `superAdminPassword`
> (the same values you put in `.env`). The `tenantSlug` is already set to `main-office`.

---

## STEP 4 — Run the requests IN ORDER

> Run top to bottom inside each folder. Earlier requests save IDs that later ones need.

---

### 4.1 — Health Check

- Open folder **Health** → send `GET /health`
- ✅ You should get: `200 OK` with `{ status: "OK" }`

---

### 4.2 — Login as Super Admin

- Open folder **Auth** → send **"Login (Super Admin)"**
- Body is already filled: your email, password, and `main-office` as tenantSlug
- ✅ You should get: `200 OK` with your user info
- Postman saves the login cookie automatically — all future requests will work

---

### 4.3 — Create a Department

- Open folder **Departments** → send **"Create Department"**
- ✅ You should get: `201 Created`
- Postman saves `departmentId` automatically for later use

---

### 4.4 — Create Extra Test Users (for role testing)

The seed only creates your super admin account. To test role-based access, you need more users.

**Step A — Register a new user** (open folder **Auth** → "Register"):

```json
{
  "name": "Test Officer",
  "email": "officer@test.com",
  "password": "Officer@123",
  "tenantSlug": "main-office"
}
```

**Step B — Verify their email using Prisma Studio:**

1. Open a new terminal in `Backend` folder
2. Run: `npx prisma studio`
3. Browser opens at `http://localhost:5555`
4. Click the **User** table
5. Find `officer@test.com` → set `emailVerified` to `true` → click Save

**Step C — Assign them a role:**

1. In Postman → folder **Users** → send "List Users" → find their user ID (auto-saved)
2. Send "Assign Role" → set role to `OFFICER`

Repeat for `ADMIN` and `CALL_OPERATOR` if you want to test all roles.

---

### 4.5 — Test Public Complaints (no login needed)

Open folder **Complaints - Public**:

| Request                 | Expected result                                                    |
| ----------------------- | ------------------------------------------------------------------ |
| Submit complaint (POST) | `201` — citizen complaint created, `trackingId` auto-saved         |
| Track complaint (GET)   | `200` — returns complaint status                                   |
| Submit feedback (POST)  | `400` right now — complaint is not resolved yet (this is correct!) |

---

### 4.6 — Test Staff Complaints (must be logged in)

Open folder **Complaints - Staff** and run IN THIS ORDER:

| #   | Request                             | Expected                                             |
| --- | ----------------------------------- | ---------------------------------------------------- |
| 1   | Create Complaint                    | `201` — `complaintId` auto-saved                     |
| 2   | List Complaints                     | `200`                                                |
| 3   | Get Complaint Details               | `200`                                                |
| 4   | Assign to Department                | `200` — status becomes `ASSIGNED`                    |
| 5   | Update Status → `IN_PROGRESS`       | `200`                                                |
| 6   | Add Note                            | `201`                                                |
| 7   | Upload Attachment                   | `201` (select a file in the form-data `files` field) |
| 8   | Update Status → `RESOLVED`          | `200`                                                |
| 9   | Update Status → `CLOSED`            | `200`                                                |
| 10  | Go back to Public → Submit Feedback | `201` ✅ now it works                                |

**Status must follow this order:** `OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`

Trying to skip (e.g., `OPEN` directly to `RESOLVED`) returns `400` — that is correct.

---

### 4.7 — Test Analytics

Open folder **Analytics** → run any request (e.g., "Complaints Overview"):

- ✅ As Super Admin: returns data
- If you log in as `CALL_OPERATOR` and send the same request: returns `403 Forbidden` — correct!

---

### 4.8 — Test Notifications

Open folder **Notifications**:

| Request            | Expected |
| ------------------ | -------- |
| List Notifications | `200`    |
| Mark one as read   | `200`    |
| Mark all as read   | `200`    |

---

### 4.9 — Test Audit Logs

Open folder **Audit Logs** → send "List Audit Logs":

- ✅ As Super Admin: returns logs
- If logged in as `OFFICER`: returns `403 Forbidden` — correct!

---

### 4.10 — Test Error Cases

Open folder **Error Cases** — these are intentionally broken requests:

| Request                    | Expected           |
| -------------------------- | ------------------ |
| Login with wrong password  | `401 Unauthorized` |
| Analytics as CALL_OPERATOR | `403 Forbidden`    |
| Invalid complaint status   | `400 Bad Request`  |
| Feedback before resolved   | `400 Bad Request`  |
| Nonexistent resource       | `404 Not Found`    |

Getting these error codes means the server is working correctly.

---

## STEP 5 — What passing looks like

| ✅ Working                           | ❌ Problem                                   |
| ------------------------------------ | -------------------------------------------- |
| Login returns `200`                  | Login returns `401` → password/email wrong   |
| Create complaint returns `201`       | Returns `400` → check the request body       |
| Status change returns `200`          | Returns `400` → wrong status order           |
| Analytics returns data (as admin)    | Returns `500` → server error, check terminal |
| `403` for restricted roles           | Returns `200` → role check is broken         |
| Feedback returns `201` after resolve | Returns `400` before resolve → correct       |

---

## Common Problems & Fixes

| Problem                                   | Fix                                                             |
| ----------------------------------------- | --------------------------------------------------------------- |
| "Cannot connect" or ECONNREFUSED          | Server is not running — go to Step 2 and run `npm run dev`      |
| Every request returns `401`               | You are not logged in — run the Login request first             |
| "Tenant not found"                        | Make sure `tenantSlug` in the environment says `main-office`    |
| Seed already ran, "tenant exists" warning | That is fine — continue normally                                |
| `nodemailer` errors in server log         | Just warnings — test emails print to console, not actually sent |
| `429 Too Many Requests`                   | Wait 15 minutes or restart the server                           |

---

## Testing Real-Time Notifications (SSE)

SSE cannot be tested in Postman. Use your browser:

1. Make sure the server is running
2. Log in via Postman first (this sets the auth cookie)
3. Open Chrome → go to `http://localhost:5000/api/v1/notifications/stream`
4. Open **DevTools** (F12) → **Network** tab → filter by `stream`
5. Click that request → **EventStream** tab
6. You should see a `connected` event
7. In Postman, change a complaint's status — a `notification` event will appear in the browser

---

## Quick Reference

| Field                | Value                                             |
| -------------------- | ------------------------------------------------- |
| Super Admin Email    | _(your `SEED_SUPER_ADMIN_EMAIL` from `.env`)_     |
| Super Admin Password | _(your `SEED_SUPER_ADMIN_PASSWORD` from `.env`)_  |
| Tenant Slug          | `main-office`                                     |
| Server URL           | `http://localhost:5000/api/v1`                    |
| Prisma Studio        | `http://localhost:5555` (run `npx prisma studio`) |
