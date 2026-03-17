# Implementation Checklist: Mounjaro Weight & Injection Tracker

This document turns the PRD into an actionable build checklist, with a strict separation between Weight and Injections from day one.

## Current Status

- Current build direction is `no-auth` for now:
  - Supabase is configured as public/no-RLS in `supabase/schema.sql`
  - The Expo app uses a public Supabase client with no session flow
  - Vercel/static web export has been prepared in `apps/app`
- Verified working today:
  - Supabase schema applied successfully
  - Seed data applied successfully
  - Expo web app loads locally
  - Dashboard reads recent weights from Supabase successfully
- Not implemented yet:
  - Add Entry forms
  - Shared UI/date/theme foundation
  - Edit flows for existing weight and injection entries

## Recommended Next Step

- Do not jump straight into section 6 screen work.
- Complete section 4 feature modules first, then wire section 6 screens.
- Immediate next implementation target:
  - Build `app/(tabs)/log.tsx` into a real entry management screen
  - Support creating new weight and injection entries
  - Support editing existing weight and injection entries from the main screens

## Separation Principle (Non-Negotiable)

- Keep Weight and Injections as two independent vertical features end-to-end:
  - Separate DB tables
  - Separate data-access modules
  - Separate state modules (no cross-imports)
  - Separate UI components and chart logic
- Only shared layers:
  - Auth/session
  - Supabase client initialization
  - Date/format utilities
  - Generic UI primitives (Card, Button, inputs, list rows)

## 0) Repo + Project Structure

- [ ] Create Expo SDK 51+ app configured for iOS + web (Expo for Web).
- [ ] Add Expo Router and match the PRD route structure:
  - `app/_layout.tsx` (auth gate + providers)
  - `app/(tabs)/_layout.tsx` (tab bar)
  - `app/(tabs)/index.tsx` (Dashboard)
  - `app/(tabs)/injections.tsx` (Injections)
  - `app/(tabs)/log.tsx` (Add Entry)
- [ ] Add dependencies: NativeWind, Zustand, Victory Native, Supabase JS client, date utilities.
- [ ] Establish feature-first folders:
  - `src/features/weight/{api.ts,store.ts,selectors.ts,components/*}`
  - `src/features/injections/{api.ts,store.ts,selectors.ts,components/*}`
  - `src/shared/{supabase.ts,auth.ts,ui/*,date.ts,theme.ts}`

## 1) Supabase Schema (Separate Tables)

### Goals

- [ ] Create `weight_entries` and `injection_entries` as separate tables.
- [ ] Use Supabase Auth securely with RLS.
- [ ] Enforce allowed dose + allowed site, and validate weight range.

### Recommended schema details

- [ ] Add `user_id uuid not null default auth.uid()` to both tables.
- [ ] Weight: unique date per user, weight range constraint (30–300).
- [ ] Injections: dose allowed list, site allowed list.
- [ ] Add indexes for efficient “latest” and list queries.

### Suggested Supabase SQL

```sql
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

alter table public.weight_entries enable row level security;

create policy "weight_entries_select_own"
on public.weight_entries for select
using (user_id = auth.uid());

create policy "weight_entries_insert_own"
on public.weight_entries for insert
with check (user_id = auth.uid());

create policy "weight_entries_update_own"
on public.weight_entries for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "weight_entries_delete_own"
on public.weight_entries for delete
using (user_id = auth.uid());

create index if not exists weight_entries_user_date_desc
on public.weight_entries (user_id, date desc);

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

alter table public.injection_entries enable row level security;

create policy "injection_entries_select_own"
on public.injection_entries for select
using (user_id = auth.uid());

create policy "injection_entries_insert_own"
on public.injection_entries for insert
with check (user_id = auth.uid());

create policy "injection_entries_update_own"
on public.injection_entries for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "injection_entries_delete_own"
on public.injection_entries for delete
using (user_id = auth.uid());

create index if not exists injection_entries_user_date_desc
on public.injection_entries (user_id, date desc);
```

## 2) Seeding

- [ ] Create a one-time seed script that reads `seed-data.json`.
- [ ] Insert weights only via the Weight feature module.
- [ ] Insert injections only via the Injections feature module.
- [ ] Seed as the logged-in app user (preferred) so `user_id` defaults correctly.

## 3) Shared Foundation (Only the truly shared bits)

- [ ] `src/shared/supabase.ts`: Supabase client initialization via environment variables.
- [ ] `src/shared/auth.ts`: sign-in/sign-out and session subscription.
- [ ] `src/shared/ui/*`: Card, Button, StatStrip, ListRow, TextField, Select, DatePicker wrappers.
- [ ] `src/shared/date.ts`: parsing/formatting utilities.
- [ ] `src/shared/theme.ts`: dark theme tokens aligned to PRD.

## 4) Feature Modules (Strict Separation)

### Weight

- [ ] `src/features/weight/api.ts`
  - [ ] Fetch entries (all + date-range filters)
  - [ ] Upsert by date (for overwrite-confirm flow)
  - [ ] Update/delete existing entries for edit flow
  - [ ] Fetch recent N
- [ ] `src/features/weight/store.ts` + `selectors.ts`
  - [ ] Entries state + loading/error
  - [ ] Derived values: latest weight, total lost, filtered series, recent list
- [ ] `src/features/weight/components/*`
  - [ ] Weight chart (Victory line + goal line + tooltip)
  - [ ] Weight list rows

### Injections

- [ ] `src/features/injections/api.ts`
  - [ ] Fetch entries (all + optional date-range)
  - [ ] Insert entry
  - [ ] Update/delete existing entries for edit flow
- [ ] `src/features/injections/store.ts` + `selectors.ts`
  - [ ] Entries state + loading/error
  - [ ] Derived values: total count, latest dose, last injection date, chart-ready series
- [ ] `src/features/injections/components/*`
  - [ ] Injection chart (bar or dot; color-coded by dose)
  - [ ] Injection list rows

## 5) Navigation + Auth Gate

- [ ] `app/_layout.tsx`: session gate (signed out -> login; signed in -> tabs).
- [ ] `app/(tabs)/_layout.tsx`: 3 tabs (Dashboard, Injections, Log).

## 6) Screens (PRD Requirements)

### Dashboard (Weight-first) — `app/(tabs)/index.tsx`

- [ ] Stats strip:
  - [ ] Start weight: 102 kg
  - [ ] Current weight: latest weight entry
  - [ ] Total lost: start - current
  - [ ] Days on journey: date diff from 12 Feb 2025
- [ ] Weight chart:
  - [ ] Line chart of all entries
  - [ ] Goal line at 70 kg (dashed)
  - [ ] Time filters: All / 6m / 3m / 1m / 1w
  - [ ] Tap point -> tooltip with date + weight
- [ ] Recent list: last 5 weight entries, newest first
- [ ] Entry management:
  - [ ] Open an existing weight entry for editing from the main screen

### Injections — `app/(tabs)/injections.tsx`

- [ ] Stats strip:
  - [ ] Total injections logged
  - [ ] Current dose: most recent injection dose
  - [ ] Last injection date
- [ ] Chart:
  - [ ] Bar or dot chart (dose over time)
  - [ ] Color-coded by dose level
- [ ] Full list: all injection entries newest first (date / dose / site)
- [ ] Entry management:
  - [ ] Open an existing injection entry for editing from the main screen

### Add Entry — `app/(tabs)/log.tsx`

- [ ] Two sections/cards on one screen:
  - [ ] Log weight
  - [ ] Log injection
- [ ] Support edit mode for both sections:
  - [ ] Prefill existing values when editing
  - [ ] Save changes back to Supabase
  - [ ] Support delete where appropriate
- [ ] Validation:
  - [ ] Weight 30–300 kg
  - [ ] Date cannot be in the future
  - [ ] Duplicate weight date -> confirmation before overwrite
  - [ ] All fields required before Save enables

## 7) Cross-Platform Verification + QA

- [ ] Verify charts render properly on iOS and web (layout + performance).
- [ ] Verify tooltip interaction on native and web.
- [ ] Verify date picker UX on both platforms.
- [ ] Confirm PRD-specific data behaviors:
  - [ ] Injection gap renders naturally
  - [ ] Plateau renders naturally
  - [ ] No “goal reached” messaging
