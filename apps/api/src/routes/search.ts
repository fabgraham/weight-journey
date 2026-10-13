import { Hono } from "hono";
import { interpretWeightQuestion, WeightSearchError } from "../weightSearch.js";

export const searchRoutes = new Hono();

searchRoutes.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Enter a valid search question." }, 400);
  }
  try {
    const question = body && typeof body === "object" ? (body as { question?: unknown }).question : undefined;
    return c.json(await interpretWeightQuestion(question));
  } catch (error) {
    if (error instanceof WeightSearchError) return c.json({ error: error.message }, error.status);
    return c.json({ error: "Search is unavailable. Try again." }, 503);
  }
});
