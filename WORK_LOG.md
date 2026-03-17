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
  - reads weight history from Supabase
  - supports range filtering and capped lists with `Load More`
- Injections screen is implemented:
  - reads injection history from Supabase
  - shows summary stats
  - caps the visible list and supports `Load More`
- Log screen is still a placeholder.

### Important Repo Notes

- `IMPLEMENTATION_CHECKLIST.md` still contains the original Auth + RLS target state in many checklist items.
- The actual current implementation direction is public/no-auth.
- `supabase/schema.sql` is now the source of truth for the current database shape.

### Next Step For Tomorrow

Build the real entry-management flow in `apps/app/app/(tabs)/log.tsx`:

1. Create a real `Log weight` form.
2. Create a real `Log injection` form.
3. Add edit mode support for both forms.
4. Allow tapping an existing weight/injection entry from the main screens to open edit mode.

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
