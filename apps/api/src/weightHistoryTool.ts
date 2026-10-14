import { WeightSearchError } from "./weightSearch.js";

export type HistoryEntry = { id: string; date: string; weight_kg: number };
export type ReadWeights = (sql: string, values: (string | number)[]) => Promise<{ rows: HistoryEntry[] }>;

export const historyTool = {
  name: "read_weight_history",
  description: "Read saved weight records, optionally filtered by dates and weight. All date boundaries are inclusive; omitted filters mean the full history. Use all for lists or summaries, first/last for chronological matches, and lowest/highest for weight extremes (including ties). Returns a complete result set for the app, an exact summary calculated by the backend, and up to 30 sample records for your explanation. Call separately for each period when comparing periods. Never infer missing measurements or treat a sample as the complete history.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      start_date: { type: "string", description: "Inclusive YYYY-MM-DD date" },
      end_date: { type: "string", description: "Inclusive YYYY-MM-DD date" },
      minimum: { type: "number", description: "Lower weight bound in kg" },
      maximum: { type: "number", description: "Upper weight bound in kg" },
      minimum_exclusive: { type: "boolean", description: "Use only with minimum; true means strictly above" },
      maximum_exclusive: { type: "boolean", description: "Use only with maximum; true means strictly below" },
      selection: { type: "string", enum: ["all", "first", "last", "lowest", "highest"] },
    },
    required: ["selection"],
  },
};

function invalid(): never { throw new WeightSearchError("Claude requested an invalid history search. Try rephrasing your question."); }

export async function readWeightHistory(input: unknown, read: ReadWeights) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const q = input as Record<string, unknown>;
  const allowed = Object.keys(historyTool.input_schema.properties);
  if (Object.keys(q).some((key) => !allowed.includes(key))) invalid();
  if (!["all", "first", "last", "lowest", "highest"].includes(q.selection as string)) invalid();
  for (const key of ["start_date", "end_date"]) {
    if (q[key] !== undefined) {
      const value = q[key];
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid();
      const date = new Date(`${value}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) invalid();
    }
  }
  if (q.start_date && q.end_date && String(q.start_date) > String(q.end_date)) invalid();
  for (const key of ["minimum", "maximum"]) {
    if (q[key] !== undefined && (typeof q[key] !== "number" || !Number.isFinite(q[key]) || q[key] <= 0 || q[key] > 1000)) invalid();
  }
  if (typeof q.minimum === "number" && typeof q.maximum === "number" && q.minimum > q.maximum) invalid();
  for (const [key, bound] of [["minimum_exclusive", "minimum"], ["maximum_exclusive", "maximum"]]) {
    if (q[key] !== undefined && (typeof q[key] !== "boolean" || q[bound] === undefined)) invalid();
  }

  // Claude never supplies SQL, table names, credentials, or write operations.
  const values: (string | number)[] = [];
  const conditions: string[] = [];
  function filter(column: string, operator: string, value: unknown) {
    if (value === undefined) return;
    values.push(value as string | number);
    conditions.push(`${column} ${operator} $${values.length}`);
  }
  filter("date", ">=", q.start_date);
  filter("date", "<=", q.end_date);
  filter("weight_kg", q.minimum_exclusive ? ">" : ">=", q.minimum);
  filter("weight_kg", q.maximum_exclusive ? "<" : "<=", q.maximum);
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const result = await read(`SELECT id, TO_CHAR(date, 'YYYY-MM-DD') AS date, weight_kg FROM weight_entries${where} ORDER BY date ASC, id ASC LIMIT 5001`, values);
  if (result.rows.length > 5000) throw new WeightSearchError("That search includes too many records. Please narrow the date range.", 400);
  const rows = result.rows.map((row) => ({ id: row.id, date: row.date, weight_kg: Number(row.weight_kg) }));
  if (rows.some((row) => !Number.isFinite(row.weight_kg))) throw new WeightSearchError("Some weight records could not be read.");
  let entries = rows;
  if (rows.length) {
    if (q.selection === "first") entries = [rows[0]];
    if (q.selection === "last") entries = [rows[rows.length - 1]];
    if (q.selection === "lowest" || q.selection === "highest") {
      const value = (q.selection === "lowest" ? Math.min : Math.max)(...rows.map((row) => row.weight_kg));
      entries = rows.filter((row) => row.weight_kg === value);
    }
  }
  const first = entries[0] ?? null;
  const last = entries[entries.length - 1] ?? null;
  const round = (value: number) => Number(value.toFixed(3));
  const weights = entries.map((entry) => entry.weight_kg);
  return {
    entries,
    evidence: {
      filters: q,
      count: entries.length,
      average_kg: entries.length ? round(weights.reduce((a, b) => a + b, 0) / entries.length) : null,
      minimum_kg: entries.length ? Math.min(...weights) : null,
      maximum_kg: entries.length ? Math.max(...weights) : null,
      first, last,
      change_kg: first && last ? round(last.weight_kg - first.weight_kg) : null,
      change_percent: first && last ? round((last.weight_kg - first.weight_kg) / first.weight_kg * 100) : null,
      sample_entries: entries.slice(0, 30),
      sample_is_complete: entries.length <= 30,
    },
  };
}
