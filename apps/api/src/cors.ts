// The production app must remain reachable when Railway's CORS setting is edited.
const PRODUCTION_ORIGIN = "https://myweightjourney.vercel.app";

export function getAllowedOrigins(configured = process.env.CORS_ORIGIN): string[] {
  const origins = [PRODUCTION_ORIGIN];
  for (const value of (configured ?? "").split(",")) {
    try {
      const url = new URL(value.trim());
      if (url.protocol === "https:" || url.protocol === "http:") origins.push(url.origin);
    } catch {
      // Ignore empty/invalid settings; the known production origin still works.
    }
  }
  return [...new Set(origins)];
}
