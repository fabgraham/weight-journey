import { Hono } from "hono";
import { pool } from "../db.js";

type InjectionEntry = {
  id: string;
  date: string;
  dose_mg: number;
  site: string;
  created_at: string;
};

export const injectionsRoutes = new Hono();

injectionsRoutes.get("/", async (c) => {
  const result = await pool.query<InjectionEntry>(
    "SELECT id, date, dose_mg, site, created_at FROM injection_entries ORDER BY date DESC"
  );
  return c.json(result.rows);
});

injectionsRoutes.get("/:id", async (c) => {
  const result = await pool.query<InjectionEntry>(
    "SELECT id, date, dose_mg, site, created_at FROM injection_entries WHERE id = $1",
    [c.req.param("id")]
  );
  return c.json(result.rows[0] ?? null);
});

injectionsRoutes.post("/", async (c) => {
  const { date, dose_mg, site } = await c.req.json<{
    date: string;
    dose_mg: number;
    site: string;
  }>();
  const result = await pool.query<InjectionEntry>(
    `INSERT INTO injection_entries (date, dose_mg, site)
     VALUES ($1, $2, $3)
     RETURNING id, date, dose_mg, site, created_at`,
    [date, dose_mg, site]
  );
  return c.json(result.rows[0], 201);
});

injectionsRoutes.put("/:id", async (c) => {
  const { date, dose_mg, site } = await c.req.json<{
    date: string;
    dose_mg: number;
    site: string;
  }>();
  const result = await pool.query<InjectionEntry>(
    `UPDATE injection_entries SET date = $1, dose_mg = $2, site = $3
     WHERE id = $4 RETURNING id, date, dose_mg, site, created_at`,
    [date, dose_mg, site, c.req.param("id")]
  );
  return c.json(result.rows[0] ?? null);
});

injectionsRoutes.delete("/:id", async (c) => {
  await pool.query("DELETE FROM injection_entries WHERE id = $1", [c.req.param("id")]);
  return new Response(null, { status: 204 });
});
