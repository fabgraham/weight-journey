import { Hono } from "hono";
import { WeightSearchError } from "../weightSearch.js";
import { askWeightHistory } from "../weightAssistant.js";
import type { HistoryEntry, ReadWeights } from "../weightHistoryTool.js";

const readWeights: ReadWeights = async (sql, values) => {
  const { pool } = await import("../db.js");
  const query = { text: sql, values, query_timeout: 10000 };
  return pool.query<HistoryEntry>(query);
};

export function createSearchRoutes(search = (question: unknown) => askWeightHistory(question, readWeights)) {
  const routes = new Hono();
  routes.post("/", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Enter a valid search question." }, 400);
    }
    try {
      const question = body && typeof body === "object" ? (body as { question?: unknown }).question : undefined;
      return c.json(await search(question));
    } catch (error) {
      if (error instanceof WeightSearchError) return c.json({ error: error.message }, error.status);
      return c.json({ error: "Search is unavailable. Try again." }, 503);
    }
  });
  return routes;
}

export const searchRoutes = createSearchRoutes();
