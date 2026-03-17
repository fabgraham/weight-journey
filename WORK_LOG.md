# Work Log

## 2026-03-17

### What Changed

- Chose a `no-auth` implementation path for now instead of the earlier Auth + RLS plan.
- Updated the Expo app to remove remaining auth/session leftovers.
- Prepared the Expo web app for Vercel static deployment.
- Fixed local Supabase connectivity by correcting the public `anon` key in `apps/app/.env`.
- Applied the no-auth Supabase schema and seed data successfully.
- Verified the dashboard and injections screens load live Supabase data.
- Added weight summary cards, date formatting, range filtering, capped lists, and `Load More` behavior.
- Added backend-backed height (`1.73m`) for BMI calculation via `profile_settings`.
- Built real create/edit/delete flows for weight and injection entries in `apps/app/app/(tabs)/log.tsx`.
- Added calendar date picking to the entry forms.
- Made main-screen entry rows tappable so they open edit mode.

### Current Working State

- `apps/app` runs locally with Expo web.
- Dashboard is implemented and working:
  - reads weight history from Supabase
  - supports range filtering and capped lists with `Load More`
- Injections screen is implemented and working:
  - reads injection history from Supabase
  - shows summary stats
  - caps the visible list and supports `Load More`
- Log screen is implemented:
  - weight-only and injection-only modes
  - create/edit/delete flows
  - calendar date selection

### Important Repo Notes

- `IMPLEMENTATION_CHECKLIST.md` still contains the original Auth + RLS target state in many checklist items.
- The actual current implementation direction is public/no-auth.
- `supabase/schema.sql` is now the source of truth for the current database shape.

### Next Step For Tomorrow

Deploy and verify the first Vercel build:

1. Import `fabgraham/weight-journey` into Vercel.
2. Set the root directory to `apps/app`.
3. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Run the first deployment and test it on another device.

After that:

1. Decide what chart polish is still needed.
2. Decide whether any log/edit UX cleanup is needed.
3. Optionally refine the entry row actions/menus further.

### How To Resume Tomorrow

From the project app directory:

```sh
cd /Users/ihk/Documents/projects/weight-journey/apps/app
npm run web
```

If Expo has stale env/cache issues:

```sh
npx expo start --web --clear
```

### Environment Reminder

`apps/app/.env` must contain:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```
