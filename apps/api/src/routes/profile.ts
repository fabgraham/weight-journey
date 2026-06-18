import { Hono } from "hono";
import { pool } from "../db.js";

type ProfileSettings = {
  id: number;
  height_m: number;
  created_at: string;
};

export const profileRoutes = new Hono();

profileRoutes.get("/", async (c) => {
  const result = await pool.query<ProfileSettings>(
    "SELECT id, height_m, created_at FROM profile_settings WHERE id = 1"
  );
  return c.json(result.rows[0] ?? null);
});
