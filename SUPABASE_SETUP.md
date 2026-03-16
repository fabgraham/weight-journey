# Supabase Setup for Mounjaro Weight & Injection Tracker

This app uses Supabase (PostgreSQL + Auth) as the backend. This document covers:
- Required database schema for `weight_entries` and `injection_entries`
- Row Level Security (RLS) policies
- How to seed data from `supabase/seed-data.json`

The app is conceptually single-user, but uses Auth + RLS so your data is private.

## “One-time and invisible” login

You only sign in once per browser/device. After that, Supabase persists your session (web: localStorage; native: AsyncStorage) and restores it automatically on app launch.

- You may need to sign in again if you clear site data, use incognito/private mode, switch devices, or revoke sessions.

## 1. Create Supabase project and get credentials

1. Create a new project in Supabase.
2. Note the **Project URL** and **anon public key** from `Project Settings -> API`.
3. You will use these values in the Expo app (environment config) when wiring the client.

## 2. Database schema

The schema follows the PRD and keeps weight and injections separate.

- `weight_entries`: one row per weight measurement per user per day
- `injection_entries`: one row per injection per user per day

### 2.1 Migration SQL

Run the following SQL in the Supabase SQL editor or add it as a migration.

```sql
-- Enable gen_random_uuid()
create extension if not exists pgcrypto;

-- weight_entries
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date date not null,
  weight_kg numeric(5,1) not null,
  created_at timestamptz not null default now(),
  constraint weight_entries_unique_user_date unique (user_id, date),
  constraint weight_entries_weight_range check (weight_kg >= 30 and weight_kg <= 300)
);

-- injection_entries
create table if not exists public.injection_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date date not null,
  dose_mg numeric(4,1) not null,
  site text not null,
  created_at timestamptz not null default now(),
  constraint injection_entries_dose_allowed check (dose_mg in (2.5, 5, 7.5, 10, 12.5)),
  constraint injection_entries_site_allowed check (site in (
    'Stomach - Lower left',
    'Stomach - Lower right',
    'Stomach - Upper left',
    'Stomach - Upper right',
    'Stomach - Lower mid',
    'Stomach - Upper mid',
    'Left thigh',
    'Right thigh',
    'Left arm',
    'Right arm'
  ))
);

-- Useful indexes for fetching latest entries
create index if not exists weight_entries_user_date_desc
  on public.weight_entries (user_id, date desc);

create index if not exists injection_entries_user_date_desc
  on public.injection_entries (user_id, date desc);
```

## 3. Row Level Security (RLS)

Enable RLS and restrict all access to the authenticated user.

```sql
alter table public.weight_entries enable row level security;
alter table public.injection_entries enable row level security;

-- Weight entries policies
create policy "weight_entries_select_own"
on public.weight_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "weight_entries_insert_own"
on public.weight_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "weight_entries_update_own"
on public.weight_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "weight_entries_delete_own"
on public.weight_entries
for delete
to authenticated
using (auth.uid() = user_id);

-- Injection entries policies
create policy "injection_entries_select_own"
on public.injection_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "injection_entries_insert_own"
on public.injection_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "injection_entries_update_own"
on public.injection_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "injection_entries_delete_own"
on public.injection_entries
for delete
to authenticated
using (auth.uid() = user_id);
```

## 4. Seeding data from supabase/seed-data.json (Auth + RLS)

File: `supabase/seed-data.json` (already in the repo) contains:
- `meta` (start_weight_kg, goal_weight_kg)
- `weight_entries` (date, weight_kg)
- `injection_entries` (date, dose_mg, site)

Create one Supabase Auth user first:

1. Supabase Dashboard -> Authentication -> Users
2. Add user (email/password) or sign up via the app later
3. Copy the user's UUID (the `id` column)

Then use the prebuilt SQL seed file:

1. Open `supabase/seed.sql`
2. Replace `<USER_UUID>` once at the top (it appears only once)
3. Paste it into the Supabase SQL editor
4. Run it once

The generated SQL will look like:

```sql
select set_config('request.jwt.claims', json_build_object('sub', '<USER_UUID>', 'role', 'authenticated')::text, true);

insert into public.weight_entries (user_id, date, weight_kg)
select auth.uid(), t.date, t.weight_kg
from (values
('2025-02-12', 102),
-- ... more rows ...
) as t(date, weight_kg);

insert into public.injection_entries (user_id, date, dose_mg, site)
select auth.uid(), t.date, t.dose_mg, t.site
from (values
('2025-02-15', 2.5, 'Stomach - Lower right'),
-- ... more rows ...
) as t(date, dose_mg, site);
```

### 4.1 Seed using the Supabase JS client (alternative)

You can also seed using Supabase JS from a Node script:

```ts
import seedData from './supabase/seed-data.json';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const USER_ID = '<USER_UUID>';

async function seed() {
  const weightRows = seedData.weight_entries.map(e => ({
    user_id: USER_ID,
    date: e.date,
    weight_kg: e.weight_kg,
  }));

  const injectionRows = seedData.injection_entries.map(e => ({
    user_id: USER_ID,
    date: e.date,
    dose_mg: e.dose_mg,
    site: e.site,
  }));

  await supabase.from('weight_entries').insert(weightRows);
  await supabase.from('injection_entries').insert(injectionRows);
}

seed().catch(console.error);
```

Use the service role key only in secure environments (never in the client app).
