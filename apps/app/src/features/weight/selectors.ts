import type { WeightEntry } from "./types";

export type PresetRange = "All" | "1M" | "3M" | "6M" | "1Y";
// A calendar year such as "2025" (January to December).
export type WeightRange = PresetRange | `${number}`;

export function isYearRange(range: WeightRange) {
  return /^\d{4}$/.test(range);
}

// Years that have at least one entry, newest first.
export function getEntryYears(entries: WeightEntry[]) {
  return [...new Set(entries.map((entry) => Number(entry.date.slice(0, 4))))].sort((a, b) => b - a);
}
const JOURNEY_START_DATE = "2025-02-12";

function subtractDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

export function getLatestWeight(entries: WeightEntry[]) {
  return entries.at(-1) ?? null;
}

export function getRecentWeights(entries: WeightEntry[], limit = 5) {
  return [...entries].slice(-limit).reverse();
}

export function getTotalLost(entries: WeightEntry[], startWeight = 102) {
  const latest = getLatestWeight(entries);
  if (!latest) return null;
  return Number((startWeight - latest.weight_kg).toFixed(1));
}

export function getWeightChangePercent(entries: WeightEntry[], startWeight = 102) {
  const latest = getLatestWeight(entries);
  if (!latest) return null;
  return Number((((startWeight - latest.weight_kg) / startWeight) * 100).toFixed(1));
}

export function getBmi(entries: WeightEntry[], heightMetres: number | null) {
  const latest = getLatestWeight(entries);
  if (!latest || heightMetres == null) return null;
  return Number((latest.weight_kg / (heightMetres * heightMetres)).toFixed(2));
}

export function getFilteredWeights(entries: WeightEntry[], range: WeightRange) {
  if (!entries.length || range === "All") return entries;
  if (isYearRange(range)) return entries.filter((entry) => entry.date.startsWith(`${range}-`));

  const latest = new Date(entries.at(-1)!.date);
  let cutoff = latest;

  if (range === "1M") cutoff = subtractDays(latest, 30);
  if (range === "3M") cutoff = subtractDays(latest, 90);
  if (range === "6M") cutoff = subtractDays(latest, 180);
  if (range === "1Y") cutoff = subtractDays(latest, 365);

  return entries.filter((entry) => new Date(entry.date) >= cutoff);
}

export function getVisibleWeights(entries: WeightEntry[], range: WeightRange, expanded: boolean) {
  const newestFirst = [...entries].reverse();

  if (expanded) return newestFirst;
  if (range === "All") return newestFirst.slice(0, 12);
  if (range === "3M") return newestFirst.slice(0, 8);
  if (range === "6M" || range === "1Y" || isYearRange(range)) return newestFirst.slice(0, 12);

  return newestFirst;
}

export function getDaysOnJourney(entries: WeightEntry[]) {
  const latest = getLatestWeight(entries);
  const endDate = latest ? new Date(`${latest.date}T00:00:00`) : new Date();
  const startDate = new Date(`${JOURNEY_START_DATE}T00:00:00`);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}
