import { Hono } from "hono";
import { pool } from "../db.js";

type WeightEntry = {
  id: string;
  date: string;
  weight_kg: number;
  created_at: string;
};

export const weightRoutes = new Hono();

const SELECT_WEIGHT = "SELECT id, TO_CHAR(date, 'YYYY-MM-DD') AS date, weight_kg, created_at FROM weight_entries";

weightRoutes.get("/recent", async (c) => {
  const limit = Number(c.req.query("limit") ?? 5);
  const result = await pool.query<WeightEntry>(
    `${SELECT_WEIGHT} ORDER BY date DESC LIMIT $1`,
    [limit]
  );
  return c.json(result.rows);
});

weightRoutes.get("/by-date/:date", async (c) => {
  const result = await pool.query<WeightEntry>(
    `${SELECT_WEIGHT} WHERE date = $1`,
    [c.req.param("date")]
  );
  return c.json(result.rows[0] ?? null);
});

weightRoutes.get("/", async (c) => {
  const result = await pool.query<WeightEntry>(
    `${SELECT_WEIGHT} ORDER BY date ASC`
  );
  return c.json(result.rows);
});

weightRoutes.get("/:id", async (c) => {
  const result = await pool.query<WeightEntry>(
    `${SELECT_WEIGHT} WHERE id = $1`,
    [c.req.param("id")]
  );
  return c.json(result.rows[0] ?? null);
});

weightRoutes.post("/upsert", async (c) => {
  const { date, weight_kg } = await c.req.json<{ date: string; weight_kg: number }>();
  const result = await pool.query<WeightEntry>(
    `INSERT INTO weight_entries (date, weight_kg)
     VALUES ($1, $2)
     ON CONFLICT (date) DO UPDATE SET weight_kg = EXCLUDED.weight_kg
     RETURNING id, TO_CHAR(date, 'YYYY-MM-DD') AS date, weight_kg, created_at`,
    [date, weight_kg]
  );
  return c.json(result.rows[0]);
});

weightRoutes.put("/:id", async (c) => {
  const { date, weight_kg } = await c.req.json<{ date: string; weight_kg: number }>();
  const result = await pool.query<WeightEntry>(
    `UPDATE weight_entries SET date = $1, weight_kg = $2
     WHERE id = $3 RETURNING id, TO_CHAR(date, 'YYYY-MM-DD') AS date, weight_kg, created_at`,
    [date, weight_kg, c.req.param("id")]
  );
  return c.json(result.rows[0] ?? null);
});

weightRoutes.delete("/:id", async (c) => {
  await pool.query("DELETE FROM weight_entries WHERE id = $1", [c.req.param("id")]);
  return new Response(null, { status: 204 });
});
