# Deployment Guide — P-CRM Platform

> Deploy the **Frontend** to Vercel and the **Backend** to Render in four steps.

---

## Commands to run locally first (before deploying)

```bash
# From the project root

# 1 — Install all dependencies
cd Backend && npm install
cd ../frontend && npm install

# 2 — Run DB migrations (requires DATABASE_URL in Backend/.env)
cd ../Backend
npx prisma migrate deploy
npx prisma generate

# 3 — Seed system roles (run once per new database)
node src/scripts/seedRoles.js   # if you have a seed script, otherwise run in Prisma Studio

# 4 — Test dev servers locally
cd ../Backend && npm run dev        # http://localhost:5000
cd ../frontend && npm run dev       # http://localhost:3000

# 5 — Verify frontend production build
cd frontend && npm run build        # must exit 0 before deploying
```

---

## Part 1 — Deploy Backend to Render

### Prerequisites

- A [Render](https://render.com) account
- PostgreSQL database (Render Postgres, Supabase, or any external provider)
- Upstash Redis instance (https://upstash.com) — free tier works
- Supabase project with a storage bucket named `complaint-attachments`
- Brevo (formerly Sendinblue) API key for email

### Steps

#### 1. Push your code to GitHub

```bash
git add .
git commit -m "chore: ready for deployment"
git push origin main
```

#### 2. Create a new Web Service on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repo `Harsh-Upadhyay005/P-CRM-Platform`
3. Configure the service:

| Setting            | Value                                                             |
| ------------------ | ----------------------------------------------------------------- |
| **Name**           | `p-crm-backend`                                                   |
| **Region**         | Choose closest to your users                                      |
| **Branch**         | `main`                                                            |
| **Root Directory** | `Backend`                                                         |
| **Runtime**        | `Node`                                                            |
| **Build Command**  | `npm install && npx prisma generate && npx prisma migrate deploy` |
| **Start Command**  | `npm start`                                                       |
| **Instance Type**  | Starter ($7/mo) or free for testing                               |
| **Node Version**   | `22` (set under Environment)                                      |

#### 3. Add environment variables on Render

In **Environment** → **Environment Variables**, add every variable below:

```
PORT                              10000
NODE_ENV                          production

DATABASE_URL                      postgresql://user:pass@host:5432/dbname?sslmode=require

JWT_ACCESS_SECRET                 <random 64-char string>
JWT_REFRESH_SECRET                <random 64-char string>
ACCESS_TOKEN_EXPIRY               15m
REFRESH_TOKEN_EXPIRY              7d

FRONTEND_URL                      https://your-app.vercel.app
BACKEND_URL                       https://p-crm-backend.onrender.com

BREVO_API_KEY                     your_brevo_api_key
BREVO_SENDER_EMAIL                noreply@youroffice.gov.in
BREVO_SENDER_NAME                 P-CRM Portal

BCRYPT_SALT_ROUNDS                12
EMAIL_VERIFICATION_EXPIRY_MINUTES 30
RESET_PASSWORD_EXPIRY_MINUTES     15

UPSTASH_REDIS_REST_URL            https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN          your_upstash_token

SUPABASE_URL                      https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY         your_service_role_key
SUPABASE_STORAGE_BUCKET           complaint-attachments
```

> **Generate strong secrets:** run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` twice.

#### 4. Run database migrations on Render

> **Free-tier note:** The Render Shell is **not available on the free tier**. The recommended approach for all tiers is to include the migration command directly in the build command so it runs automatically on every deploy.

Update your **Build Command** on Render to:

```
npm install && npx prisma generate && npx prisma migrate deploy
```

This ensures migrations run before the new server starts on every deployment, with zero manual steps.

#### 5. Seed the role table (first deploy only)

Connect to your PostgreSQL database and run:

```sql
INSERT INTO "Role" (id, type, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'SUPER_ADMIN', now(), now()),
  (gen_random_uuid(), 'ADMIN',       now(), now()),
  (gen_random_uuid(), 'DEPARTMENT_HEAD', now(), now()),
  (gen_random_uuid(), 'OFFICER',     now(), now()),
  (gen_random_uuid(), 'CALL_OPERATOR', now(), now())
ON CONFLICT (type) DO NOTHING;
```

#### 6. Verify

Visit `https://p-crm-backend.onrender.com/health` — you should see:

```json
{
  "statusCode": 200,
  "data": { "status": "OK" },
  "message": "Server is healthy"
}
```

---

## Part 2 — Deploy Frontend to Vercel

### Prerequisites

- A [Vercel](https://vercel.com) account
- Backend deployed and its URL noted

### Steps

#### 1. Install Vercel CLI (optional but useful)

```bash
npm install -g vercel
```

#### 2. Import project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** → select `Harsh-Upadhyay005/P-CRM-Platform`
3. Configure:

| Setting              | Value                     |
| -------------------- | ------------------------- |
| **Framework Preset** | `Next.js` (auto-detected) |
| **Root Directory**   | `frontend`                |
| **Build Command**    | `npm run build` (default) |
| **Output Directory** | `.next` (default)         |
| **Install Command**  | `npm install`             |
| **Node.js Version**  | `22.x`                    |

#### 3. Add environment variables on Vercel

In **Settings** → **Environment Variables**, add:

```
NEXT_PUBLIC_API_URL     https://p-crm-backend.onrender.com/api/v1
```

> This is the **only** required env var for the frontend. All other config lives on the backend.

#### 4. Deploy

Click **Deploy**. Vercel runs `npm run build` and serves the result.

#### 5. Update CORS on the backend

After Vercel assigns your domain (e.g. `https://p-crm-platform.vercel.app`), update `FRONTEND_URL` on Render to match.

#### 6. Verify

Visit your Vercel URL → the login page should load. Login with your admin credentials.

---

## Environment Variable Reference

### Backend (Render)

| Variable                            | Required | Description                                                             |
| ----------------------------------- | -------- | ----------------------------------------------------------------------- |
| `PORT`                              | ✅       | Server port — Render auto-sets this; also set to `10000` as fallback    |
| `NODE_ENV`                          | ✅       | `production`                                                            |
| `DATABASE_URL`                      | ✅       | PostgreSQL connection string with `?sslmode=require`                    |
| `JWT_ACCESS_SECRET`                 | ✅       | 64-byte random hex string                                               |
| `JWT_REFRESH_SECRET`                | ✅       | 64-byte random hex string (different from access)                       |
| `ACCESS_TOKEN_EXPIRY`               | ✅       | `15m`                                                                   |
| `REFRESH_TOKEN_EXPIRY`              | ✅       | `7d`                                                                    |
| `FRONTEND_URL`                      | ✅       | Your Vercel URL (for CORS)                                              |
| `BACKEND_URL`                       | ✅       | Your Render URL (for email links)                                       |
| `BREVO_API_KEY`                     | ✅       | From brevo.com → API Keys                                               |
| `BREVO_SENDER_EMAIL`                | ✅       | Verified sender email                                                   |
| `BREVO_SENDER_NAME`                 | ✅       | Display name in emails                                                  |
| `BCRYPT_SALT_ROUNDS`                | ✅       | `12` recommended                                                        |
| `EMAIL_VERIFICATION_EXPIRY_MINUTES` | ✅       | `30`                                                                    |
| `RESET_PASSWORD_EXPIRY_MINUTES`     | ✅       | `15`                                                                    |
| `UPSTASH_REDIS_REST_URL`            | ✅       | From upstash.com → Redis instance                                       |
| `UPSTASH_REDIS_REST_TOKEN`          | ✅       | From upstash.com → Redis instance                                       |
| `SUPABASE_URL`                      | ✅       | From supabase.com → project settings → API                              |
| `SUPABASE_SERVICE_ROLE_KEY`         | ✅       | From supabase.com → project settings → API (service role, NOT anon key) |
| `SUPABASE_STORAGE_BUCKET`           | ✅       | `complaint-attachments` (create in Supabase Storage first)              |

### Frontend (Vercel)

| Variable              | Required | Description                                                                 |
| --------------------- | -------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | ✅       | Full backend API base URL, e.g. `https://p-crm-backend.onrender.com/api/v1` |

---

## Post-Deployment Checklist

- [ ] Backend health check returns `200 OK`
- [ ] Database migrations applied
- [ ] Role table seeded (5 roles)
- [ ] Supabase bucket `complaint-attachments` exists and is private
- [ ] At least one tenant created via `POST /api/v1/tenants` (SUPER_ADMIN)
- [ ] At least one ADMIN user registered
- [ ] Frontend loads and can reach the backend (no CORS errors)
- [ ] Login works and dashboard loads
- [ ] SSE notifications stream opens (`/notifications/stream`)
- [ ] File upload works (test from complaint detail page)

---

## Troubleshooting

| Issue                                  | Fix                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `CORS: origin not allowed`             | Update `FRONTEND_URL` on Render to exact Vercel URL                                                                       |
| `P1001: Can't reach database`          | Check `DATABASE_URL` includes `?sslmode=require`                                                                          |
| `Redis connection failed`              | Verify `UPSTASH_REDIS_REST_URL` and token — must be REST URL not regular Redis URL                                        |
| `PrismaClientInitializationError`      | Run `npx prisma generate` in the build command                                                                            |
| `401 on every request`                 | Cookie domain mismatch — ensure frontend and backend are on different domains (not subdomains) and `sameSite: lax` is set |
| Build fails with type errors           | Run `npm run build` locally first — fix all TypeScript errors before pushing                                              |
| Render cold start (slow first request) | Upgrade from free to Starter tier, or use an external uptime monitor (cron-job.org) to keep it warm                       |

---

## Creating Your First Tenant & Admin

After deployment, bootstrap the system via the API:

```bash
# 1 — Register the first user (becomes CALL_OPERATOR by default)
#     You'll need to manually promote them to SUPER_ADMIN in the database.

# 2 — Using psql or any DB client, run:
UPDATE "User" SET "roleId" = (SELECT id FROM "Role" WHERE type = 'SUPER_ADMIN') WHERE email = 'your@email.com';

# 3 — Create a tenant via the API (now authenticated as SUPER_ADMIN):
curl -X POST https://p-crm-backend.onrender.com/api/v1/tenants \
  -H "Content-Type: application/json" \
  -b "accessToken=YOUR_TOKEN" \
  -d '{"name": "Mumbai Municipal Office", "slug": "mumbai-mco"}'

# 4 — Register a new ADMIN user with that tenant slug:
curl -X POST https://p-crm-backend.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin User", "email": "admin@office.gov.in", "password": "Str0ng!Pass", "tenantSlug": "mumbai-mco"}'

# 5 — Promote to ADMIN via the Users page in the dashboard (or via API).
```
