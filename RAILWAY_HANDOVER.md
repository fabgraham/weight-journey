# Railway Migration — Handover Doc

## Current Status

Code changes are done. The app is NOT yet connected to Railway — that requires
deploying the API and setting up the database, which needs to be done from a
Mac with admin access (to install psql via Homebrew).

The Vercel deployment still works (it still uses the old Supabase env vars in
Vercel's dashboard). Local development is broken until the Railway API is live
and `.env` is updated.

---

## What Has Already Been Done

### New files created
- `apps/api/` — the Hono API server that will run on Railway
  - `src/index.ts` — app entry point
  - `src/db.ts` — Postgres connection pool
  - `src/middleware/auth.ts` — API key authentication
  - `src/routes/weight.ts` — weight CRUD endpoints
  - `src/routes/injections.ts` — injection CRUD endpoints
  - `src/routes/profile.ts` — profile settings endpoint
  - `package.json`, `tsconfig.json`, `.env.example`
- `apps/app/src/shared/apiClient.ts` — replaces the Supabase JS client

### Modified files
- `apps/app/src/features/weight/api.ts` — now uses `apiClient` instead of Supabase
- `apps/app/src/features/injections/api.ts` — now uses `apiClient` instead of Supabase
- `apps/app/src/shared/profile.ts` — now uses `apiClient` instead of Supabase
- `apps/app/package.json` — removed `@supabase/supabase-js` and `react-native-url-polyfill`
- `apps/app/.env` — **placeholder values** (see note below)

### Deleted files
- `apps/app/src/shared/supabase.ts`

### `.env` current state (placeholder — needs real values after Railway is live)
```
EXPO_PUBLIC_API_BASE_URL=https://your-api.up.railway.app
EXPO_PUBLIC_API_SECRET=your-api-secret-here
```

---

## Railway Account

- Free account created at railway.app
- Comes with $5 credit (enough for ~1 month)
- PostgreSQL instance already created
- Database URL: `postgresql://postgres:GwQnGaFBupslwoLrmJyhLXSNtFfrZiYS@thomas.proxy.rlwy.net:38329/railway`
- **Regenerate the password after migration is complete** (Railway dashboard → Postgres service → Settings → Credentials)

---

## What Still Needs To Be Done

Work through these steps from a Mac with admin access (to install psql via Homebrew).

### Step 1 — Install psql
```bash
brew install postgresql
```

### Step 2 — Run the schema on Railway Postgres
```bash
cd /path/to/weight-journey
psql "postgresql://postgres:GwQnGaFBupslwoLrmJyhLXSNtFfrZiYS@thomas.proxy.rlwy.net:38329/railway" -f supabase/schema.sql
```

### Step 3 — Export live data from Supabase (optional — skip to start fresh)
Get the Supabase direct connection URI from:
Supabase dashboard → Project Settings → Database → URI (Direct connection)

```bash
pg_dump \
  --data-only \
  --column-inserts \
  --table=profile_settings \
  --table=weight_entries \
  --table=injection_entries \
  "<supabase-direct-connection-uri>" \
  > live-data.sql

psql "postgresql://postgres:GwQnGaFBupslwoLrmJyhLXSNtFfrZiYS@thomas.proxy.rlwy.net:38329/railway" -f live-data.sql
```

### Step 4 — Install API dependencies
```bash
cd apps/api
npm install
```

### Step 5 — Deploy the API to Railway
1. In Railway dashboard → project → **+ Create** → **GitHub Repo**
2. Select the `weight-journey` repo
3. Set **Root Directory** to `apps/api`
4. Go to the service **Variables** tab and add:
   - `DATABASE_URL` → click **Add Reference** → select the Postgres service
   - `API_SECRET` → run `openssl rand -hex 32` in terminal to generate a value
   - `CORS_ORIGIN` → your Vercel app URL (e.g. `https://weight-journey.vercel.app`)
5. Railway deploys automatically — copy the generated service URL

### Step 6 — Update environment variables

**`apps/app/.env`** (local dev):
```
EXPO_PUBLIC_API_BASE_URL=https://<your-railway-service-url>
EXPO_PUBLIC_API_SECRET=<same value as API_SECRET in Railway>
```

**Vercel** (Project Settings → Environment Variables):
- Remove `EXPO_PUBLIC_SUPABASE_URL`
- Remove `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Add `EXPO_PUBLIC_API_BASE_URL` → Railway service URL
- Add `EXPO_PUBLIC_API_SECRET` → same secret as above
- Redeploy the Vercel app

### Step 7 — Test
```bash
# Health check
curl https://<railway-service-url>/health

# Fetch weight entries
curl -H "x-api-key: <your-secret>" https://<railway-service-url>/weight
```

Then open the app and confirm all screens load and data saves correctly.

### Step 8 — Regenerate Railway DB password
Railway dashboard → Postgres service → Settings → Credentials → Reset Password
Update `DATABASE_URL` in Railway's API service variables.

### Step 9 — Decommission Supabase (once confirmed working)
Supabase dashboard → Project Settings → Danger Zone → Delete Project

---

## Full migration guide
See `RAILWAY_MIGRATION.md` for the complete reference doc.
