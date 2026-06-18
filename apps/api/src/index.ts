import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireApiKey } from "./middleware/auth.js";
import { weightRoutes } from "./routes/weight.js";
import { injectionsRoutes } from "./routes/injections.js";
import { profileRoutes } from "./routes/profile.js";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

if (process.env.CORS_ORIGIN) {
  app.use("*", cors({ origin: process.env.CORS_ORIGIN }));
}

app.use("*", requireApiKey);

app.route("/weight", weightRoutes);
app.route("/injections", injectionsRoutes);
app.route("/profile", profileRoutes);

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on port ${port}`);
});
