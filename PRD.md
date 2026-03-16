# PRD: Mounjaro Weight & Injection Tracker

## Overview

A personal health tracking app to log and visualise weight loss progress and Mounjaro injection history. The app is for a single user and is not multi-user or social. It runs on both web and iOS from a single React Native / Expo codebase.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native with Expo (SDK 51+) |
| Web support | Expo for Web |
| Navigation | Expo Router (file-based) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password, single user) |
| Charts | Victory Native (works on both native and web) |
| Styling | NativeWind (Tailwind for React Native) |
| State | Zustand |

---

## Database Schema (Supabase)

### Table: `weight_entries`

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, default gen_random_uuid() |
| date | date | Unique. Format: YYYY-MM-DD |
| weight_kg | numeric(5,1) | e.g. 87.8 |
| created_at | timestamptz | Default now() |

### Table: `injection_entries`

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, default gen_random_uuid() |
| date | date | Format: YYYY-MM-DD |
| dose_mg | numeric(4,1) | e.g. 2.5, 5.0, 7.5, 10.0, 12.5 |
| site | text | See allowed values below |
| created_at | timestamptz | Default now() |

### Allowed injection sites

```
Stomach - Lower left
Stomach - Lower right
Stomach - Upper left
Stomach - Upper right
Stomach - Lower mid
Stomach - Upper mid
Left thigh
Right thigh
Left arm
Right arm
```

### Allowed doses (mg)

```
2.5, 5, 7.5, 10, 12.5
```

---

## Seed Data

All historical data lives in `seed-data.json` alongside this file.

To seed Supabase, run the provided seed script or paste directly into the Supabase SQL editor using:

```sql
INSERT INTO weight_entries (date, weight_kg) VALUES
('2024-02-12', 102),
-- ... (generate from seed-data.json)
```

Or use the Supabase JS client in a one-time seed script:

```js
import seedData from './seed-data.json'
import { supabase } from './lib/supabase'

await supabase.from('weight_entries').insert(seedData.weight_entries)
await supabase.from('injection_entries').insert(seedData.injection_entries)
```

---

## App Structure (Expo Router)

```
app/
  _layout.tsx          # Root layout, auth gate
  (tabs)/
    _layout.tsx        # Tab bar
    index.tsx          # Dashboard (weight focus)
    injections.tsx     # Injection history
    log.tsx            # Add new entry
```

---

## Screens

### 1. Dashboard (`index.tsx`)

The primary screen. Weight is the main focus.

**Stats strip (top)**
- Start weight: 102 kg
- Current weight: latest entry
- Total lost: start minus current
- Days on journey: date diff from 12 Feb 2025

**Weight chart**
- Line chart, all entries from start to today
- X axis: dates (auto-scaled)
- Y axis: weight in kg
- Goal line: dashed horizontal at 70 kg
- Time filter buttons: All / 6m / 3m / 1m / 1w
- Tapping a data point shows date + weight in a tooltip

**Recent entries list**
- Last 5 weight entries
- Date + weight, newest first

---

### 2. Injections (`injections.tsx`)

Secondary screen. Shows injection history only.

**Stats strip (top)**
- Total injections logged
- Current dose: dose from most recent injection entry
- Last injection: date of most recent entry

**Injection chart**
- Bar chart or dot chart showing dose over time
- X axis: dates
- Y axis: dose in mg (2.5 to 12.5)
- Colour-coded by dose level (lighter = lower dose, darker = higher)

**Full injection list**
- All entries, newest first
- Each row: date / dose / site

---

### 3. Add Entry (`log.tsx`)

Two sections on the same screen, separated visually.

**Log weight**
- Number input: weight in kg (decimal allowed, e.g. 62.5)
- Date picker: defaults to today
- Save button

**Log injection**
- Dropdown: dose (2.5 / 5 / 7.5 / 10 / 12.5 mg)
- Dropdown: injection site (full list from schema above)
- Date picker: defaults to today
- Save button

Validation rules:
- Weight must be between 30 and 300 kg
- Date cannot be in the future
- Duplicate date on weight entries: show confirmation before overwriting
- All fields required before save button activates

---

## Design Direction

**Tone:** Clean, calm, personal. Not clinical. Not gamified.

**Theme:** Dark mode preferred. Deep charcoal background (#1a1a1f), warm off-white text, teal/green accent for weight progress (#1D9E75), amber for injection markers (#BA7517).

**Typography:** Single font family, medium weight for numbers, regular for labels.

**Charts:**
- Weight line: teal (#1D9E75) with subtle area fill below
- Goal line: dashed, muted
- Injection bars/dots: amber (#BA7517)

**Spacing:** Generous. Cards with rounded corners (radius 12). No borders, use background contrast instead.

---

## Data Notes

- All historical data starts 12 Feb 2025
- There is a ~5 week injection gap between 7 Feb 2026 and 14 Mar 2026 (intentional, user stopped for a month)
- Weight entries from Jan–Mar 2025 show a small plateau around 62–64 kg — this is expected and should render naturally on the chart
- The app should not show any "goal reached" messaging since the user passed their 70 kg goal and has continued losing
- 3 more injections are expected to be added via the log screen before the user stops Mounjaro entirely
- The `seed-data.json` file contains 57 weight entries and 53 injection entries

---

## Out of Scope (v1)

- Multi-user support
- Push notifications / reminders
- Photo logging
- BMI calculation display
- Export / sharing
- Apple Health integration
