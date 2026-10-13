import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireApiKey } from "./middleware/auth.js";
import { weightRoutes } from "./routes/weight.js";
import { injectionsRoutes } from "./routes/injections.js";
import { profileRoutes } from "./routes/profile.js";
import { searchRoutes } from "./routes/search.js";
import { getAllowedOrigins } from "./cors.js";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.use("*", cors({ origin: getAllowedOrigins() }));

app.use("*", requireApiKey);

app.route("/weight", weightRoutes);
app.route("/injections", injectionsRoutes);
app.route("/profile", profileRoutes);
app.route("/weight-search", searchRoutes);

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on port ${port}`);
});
