# Work Log

## 2026-03-16

### What Changed

- Chose a `no-auth` implementation path for now instead of the earlier Auth + RLS plan.
- Updated the Expo app to remove remaining auth/session leftovers.
- Prepared the Expo web app for Vercel static deployment.
- Fixed local Supabase connectivity by correcting the public `anon` key in `apps/app/.env`.
- Applied the no-auth Supabase schema and seed data successfully.
- Verified the dashboard can now load recent weights from Supabase.

### Current Working State

- `apps/app` runs locally with Expo web.
- Dashboard is partially implemented and working:
  - reads recent weights from Supabase
- Injections screen is still a placeholder.
- Log screen is still a placeholder.

### Important Repo Notes

- `IMPLEMENTATION_CHECKLIST.md` still contains the original Auth + RLS target state in many checklist items.
- The actual current implementation direction is public/no-auth.
- `supabase/schema.sql` is now the source of truth for the current database shape.

### Next Step For Tomorrow

Build the Injections vertical first before polishing screens:

1. Create `apps/app/src/features/injections/api.ts`.
2. Create `apps/app/src/features/injections/store.ts`.
3. Create `apps/app/src/features/injections/selectors.ts`.
4. Update `apps/app/app/(tabs)/injections.tsx` to:
   - fetch injection entries
   - show total injections
   - show current dose
   - show last injection date
   - render a newest-first list

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
