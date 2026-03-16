import fs from "node:fs";
import path from "node:path";

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) return null;
  return next;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const userId = getArgValue("--user-id") ?? "<USER_UUID>";

const explicitSeedPath = getArgValue("--seed-path");
const defaultSeedCandidates = [
  path.resolve(process.cwd(), "supabase", "seed-data.json"),
  path.resolve(process.cwd(), "seed-data.json"),
];

const seedPath =
  explicitSeedPath ??
  defaultSeedCandidates.find((p) => fs.existsSync(p));

if (!seedPath) {
  throw new Error(
    "Seed file not found. Provide --seed-path or create supabase/seed-data.json or seed-data.json."
  );
}

const raw = fs.readFileSync(seedPath, "utf8");
const seed = JSON.parse(raw);

const weightEntries = Array.isArray(seed.weight_entries) ? seed.weight_entries : [];
const injectionEntries = Array.isArray(seed.injection_entries) ? seed.injection_entries : [];

const lines = [];

lines.push("-- One-time seed for Weight Journey app");
lines.push(`-- Generated from ${seedPath}`);
lines.push(`-- User: ${userId}`);
lines.push("");

if (weightEntries.length) {
  lines.push("insert into public.weight_entries (user_id, date, weight_kg) values");
  for (let i = 0; i < weightEntries.length; i++) {
    const e = weightEntries[i];
    const row = `(${sqlString(userId)}, ${sqlString(e.date)}, ${Number(e.weight_kg)})`;
    lines.push(`${row}${i === weightEntries.length - 1 ? ";" : ","}`);
  }
  lines.push("");
}

if (injectionEntries.length) {
  lines.push("insert into public.injection_entries (user_id, date, dose_mg, site) values");
  for (let i = 0; i < injectionEntries.length; i++) {
    const e = injectionEntries[i];
    const row = `(${sqlString(userId)}, ${sqlString(e.date)}, ${Number(e.dose_mg)}, ${sqlString(e.site)})`;
    lines.push(`${row}${i === injectionEntries.length - 1 ? ";" : ","}`);
  }
  lines.push("");
}

process.stdout.write(lines.join("\n"));
