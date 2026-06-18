# Railway Migration Guide

Migrating from Supabase (free tier pauses after 7 days) to Railway ($5/month Hobby, no pausing).

**Architecture after migration:**
```
Expo App (Vercel)
  → fetch + x-api-key header
  → Hono API (Railway service)
  → PostgreSQL (Railway database)
```

---

## Phase 1 — Create Railway Project & Database

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click **New Project** → **Empty Project**, name it `weight-journey`
3. Click **+ Create** → **Database** → **Add PostgreSQL**
4. Wait ~30 seconds for Postgres to spin up
5. Click the Postgres service → **Connect** tab → copy the **Database URL**

---

## Phase 2 — Run the Schema

Connect to the Railway database and run the existing schema file.

**Option A — psql (terminal)**
```bash
psql "<your-railway-database-url>" -f supabase/schema.sql
```

**Option B — TablePlus / another GUI client**
1. New connection → paste the Database URL
2. Open a query window → paste contents of `supabase/schema.sql` → run

---

## Phase 3 — Migrate Live Data from Supabase

Skip this if you're happy to start fresh. Otherwise:

**Step 1 — Get the Supabase direct connection URI**
- Supabase dashboard → Project Settings → Database → **URI** (use "Direct connection", not the pooler)

**Step 2 — Export data**
```bash
pg_dump \
  --data-only \
  --column-inserts \
  --table=profile_settings \
  --table=weight_entries \
  --table=injection_entries \
  "<supabase-direct-connection-uri>" \
  > live-data.sql
```

**Step 3 — Import into Railway**
```bash
psql "<railway-database-url>" -f live-data.sql
```

---

## Phase 4 — Deploy the Hono API to Railway

The API lives at `apps/api/`.

1. In the Railway project, click **+ Create** → **GitHub Repo**
2. Select the `weight-journey` repo
3. Set **Root Directory** to `apps/api`
4. Railway auto-detects Node.js and runs `npm install && npm run build && npm start`
5. Add environment variables (Settings → Variables):
   - `DATABASE_URL` — click **Add Reference** → select the Postgres service (Railway links it automatically)
   - `API_SECRET` — generate a random string (32+ chars), e.g. run `openssl rand -hex 32` in your terminal
   - `CORS_ORIGIN` — your Vercel app URL, e.g. `https://weight-journey.vercel.app`
6. Railway will deploy automatically. Copy the generated service URL (e.g. `https://weight-journey-api.up.railway.app`)

---

## Phase 5 — Update Environment Variables

**In `apps/app/.env`** (for local development):
```
EXPO_PUBLIC_API_BASE_URL=https://your-api.up.railway.app
EXPO_PUBLIC_API_SECRET=your-api-secret-here
```

**In Vercel** (Project Settings → Environment Variables):
- Remove `EXPO_PUBLIC_SUPABASE_URL`
- Remove `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Add `EXPO_PUBLIC_API_BASE_URL` → Railway service URL
- Add `EXPO_PUBLIC_API_SECRET` → same value as `API_SECRET` in Railway

Redeploy the Vercel app after updating env vars.

---

## Phase 6 — Test

**Test the API directly:**
```bash
# Health check (no auth needed)
curl https://your-api.up.railway.app/health

# Fetch weight entries
curl -H "x-api-key: your-secret" https://your-api.up.railway.app/weight

# Upsert a weight entry
curl -X POST \
  -H "x-api-key: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-18","weight_kg":80}' \
  https://your-api.up.railway.app/weight/upsert
```

**Test the app:**
1. Run `npm start` in `apps/app/` — all screens should load as before
2. Log a new weight entry and confirm it saves
3. Check Railway's Postgres service to confirm the row exists

---

## Phase 7 — Decommission Supabase

Once everything is confirmed working on Railway:
1. Export a final backup from Supabase if desired
2. In Supabase dashboard → Project Settings → **Danger Zone** → Delete project
   (or just leave it — it will auto-pause and eventually be deleted by Supabase after inactivity)

---

## Files Changed in This Migration

| File | Change |
|------|--------|
| `apps/api/` | New — Hono API server |
| `apps/app/src/shared/apiClient.ts` | New — replaces Supabase client |
| `apps/app/src/features/weight/api.ts` | Rewritten to use `apiRequest` |
| `apps/app/src/features/injections/api.ts` | Rewritten to use `apiRequest` |
| `apps/app/src/shared/profile.ts` | Updated to use `apiRequest` |
| `apps/app/src/shared/supabase.ts` | Deleted |
| `apps/app/package.json` | Removed `@supabase/supabase-js` and `react-native-url-polyfill` |
| `apps/app/.env` | Replaced Supabase vars with `EXPO_PUBLIC_API_BASE_URL` + `EXPO_PUBLIC_API_SECRET` |

---

## Reusing This Pattern for Other Projects (e.g. Guitar Maintenance)

1. Copy `apps/api/` into the other project
2. Replace `src/routes/` with routes matching that project's schema
3. Create a second Postgres service in the same Railway project (~$1–2/month extra)
4. Same `apiClient.ts` pattern works unchanged in the Expo app
5. Total Railway cost for two projects: ~$3–4/month, within the $5 Hobby plan
