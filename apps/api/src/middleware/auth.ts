import type { MiddlewareHandler } from "hono";

const secret = process.env.API_SECRET;

if (!secret) {
  throw new Error("API_SECRET is required");
}

export const requireApiKey: MiddlewareHandler = async (c, next) => {
  if (c.req.header("x-api-key") !== secret) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};
