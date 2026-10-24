# Weight Journey API

Use Node.js 22 or later. Run `npm install`, copy `.env.example` to `.env`, fill in
the database connection and API secret, then run `npm run dev`. The dev and start
commands load `.env` when present. On Railway, use the service's Variables tab.
The live app origin (`https://myweightjourney.vercel.app`) is always allowed by
CORS. `CORS_ORIGIN` can add origins such as `http://localhost:8081`, separated by
commas; whitespace, paths, and trailing slashes are normalized to URL origins.

The database tables are defined in `db/schema.sql`. To create them on a new
Postgres instance, run `psql "$DATABASE_URL" -f db/schema.sql`.

## Claude search

Set `ANTHROPIC_API_KEY` on the **API service**, then restart/redeploy it. Never put
this key in the Expo app, an `EXPO_PUBLIC_` variable, or a committed file.
If the key is not scoped to one workspace (for example, a `sk-ant-usr-` key),
also set `ANTHROPIC_WORKSPACE_ID` on the API service. Find the `wrkspc_...` ID in
Claude Console → Settings → Workspaces, using the workspace in your credited
organization. The backend sends it in the `anthropic-workspace-id` header.
Workspace-scoped API keys do not need this setting.

`POST /weight-search` takes `{ "question": "Give me all weights between 64 and 65kg this year" }`
and returns `{ supported, answer, comment, entries }`. `comment` is optional (null
when Claude has no useful observation). The app lists the returned records and
highlights them on the graph. The app first tries its local search. Only questions
the local search cannot handle reach Claude; local answers have no Claude comment.

The model remains fixed to `claude-sonnet-5-5` in `src/weightSearch.ts`. Adaptive thinking is
enabled with medium effort. Each search allows at most five Claude calls, eight
read-only tool calls, a 45-second provider deadline, and 4,096 output tokens (including thinking) per
call. Database reads have a 10-second client timeout.

Claude chooses filters and operations through `read_weight_history`. The backend
validates inputs and executes parameterized SELECT queries against weight records
only. It supports inclusive date ranges, inclusive or strict weight bounds,
first/last matches, tied lowest/highest records, counts, averages, and change
summaries. Claude can compare periods using multiple reads. Relative dates use
the current date in Europe/London. Questions whose constraints cannot be expressed
by the tool should return a clarification, rather than drop constraints.

Claude receives the question, selected weight summaries, and at most 30 sample
records per tool call (IDs, dates, kilograms). Full result sets are kept on the
backend and returned to the app; a search may return up to 5,000 records per read.
Larger searches fail explicitly and ask for a narrower range. Database credentials,
profile information, notes, and injection records are never sent to Claude.
Records sent as tool evidence are processed by Anthropic; tool access does not
make that processing local. Answers and optional comments are model-generated;
record IDs are validated against complete backend result sets, but that does not
verify every statement in the text. Tool evidence explicitly supplies its
`result_set_id`, which identifies the full result set rather than an individual
weight record. The API requests JSON schema output for the answer. If a final
answer still fails validation after data was retrieved, it allows one correction
attempt using the existing evidence, within the same five-call limit. Invalid
references are never silently accepted; an omitted optional comment becomes null.

This uses the existing shared-key authentication and personal weight database.
It does not add multi-user isolation; multi-user hosting would require identity
and ownership checks before querying records.

Run `npm test` for mocked provider, tool validation, and HTTP regression tests.
These tests never use a real API key or incur API charges.
