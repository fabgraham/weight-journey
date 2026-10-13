# Weight Journey API

Use Node.js 22 or later. Run `npm install`, copy `.env.example` to `.env`, fill in
the database connection and API secret, then run `npm run dev`. The dev and start
commands load `.env` when present. On Railway, use the service's Variables tab.
The live app origin (`https://myweightjourney.vercel.app`) is always allowed by
CORS. `CORS_ORIGIN` can add origins such as `http://localhost:8081`, separated by
commas; whitespace, paths, and trailing slashes are normalized to URL origins.

## Claude search

Set `ANTHROPIC_API_KEY` on the **API service**, then restart/redeploy it. Never put
this key in the Expo app, an `EXPO_PUBLIC_` variable, or a committed file.

`POST /weight-search` takes `{ "question": "Find my most recent weigh-in above 65 kilos" }`.
It uses the existing `x-api-key` authentication. The model is fixed to
`claude-haiku-5-5` in `src/weightSearch.ts`; no model selector or automatic upgrade
is used. Each request makes at most one Claude call, with a 15-second timeout and
a 256-token output cap. Thinking is disabled and effort is low.

Claude receives the question and search instructions, with no saved weight
records. Validated operations become canonical questions that the app executes
against its own history. Unsupported requests return `{ "question": null }`.
First/last comparisons, all matching entries, and lowest/highest weights are
supported. Date restrictions, ranges, trends, and medical advice are unsupported.

Local questions never call this endpoint. If the key is absent or Claude fails,
local search continues to work and the app displays an actionable message.

Run `npm test` for mocked provider and HTTP regression tests. These tests never
use a real API key or incur API charges.
