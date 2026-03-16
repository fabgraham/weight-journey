-- Schema + RLS for Weight Journey app (NO AUTH MODE)
-- Matches PRD tables and keeps weight + injections separate.
-- Uses PUBLIC tables (no RLS) for simplicity.

create extension if not exists pgcrypto;

-- -----------------------------
-- weight_entries
-- -----------------------------
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  weight_kg numeric(5,1) not null,
  created_at timestamptz not null default now(),
  constraint weight_entries_unique_date unique (date),
  constraint weight_entries_weight_range check (weight_kg >= 30 and weight_kg <= 300),
  constraint weight_entries_date_not_future check (date <= current_date)
);

create index if not exists weight_entries_date_desc
  on public.weight_entries (date desc);

-- DISABLE RLS so it's public
alter table public.weight_entries disable row level security;

-- -----------------------------
-- injection_entries
-- -----------------------------
create table if not exists public.injection_entries (
  id uuid primary key default gen_random_uuid(),
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
  )),
  constraint injection_entries_date_not_future check (date <= current_date)
);

create index if not exists injection_entries_date_desc
  on public.injection_entries (date desc);

-- DISABLE RLS so it's public
alter table public.injection_entries disable row level security;
