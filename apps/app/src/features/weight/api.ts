import { apiRequest } from "../../shared/apiClient";
import type { WeightEntry } from "./types";

// Postgres NUMERIC columns arrive as strings (e.g. "63.0"); convert so arithmetic doesn't concatenate.
function toEntry(entry: WeightEntry): WeightEntry {
  return { ...entry, weight_kg: Number(entry.weight_kg) };
}

function toEntryOrNull(entry: WeightEntry | null): WeightEntry | null {
  return entry ? toEntry(entry) : null;
}

export async function listWeightEntries(): Promise<WeightEntry[]> {
  return (await apiRequest<WeightEntry[]>("/weight")).map(toEntry);
}

export async function listRecentWeightEntries(limit = 5): Promise<WeightEntry[]> {
  return (await apiRequest<WeightEntry[]>(`/weight/recent?limit=${limit}`)).map(toEntry);
}

export async function getWeightEntryById(id: string): Promise<WeightEntry | null> {
  return toEntryOrNull(await apiRequest<WeightEntry | null>(`/weight/${id}`));
}

export async function getWeightEntryByDate(date: string): Promise<WeightEntry | null> {
  return toEntryOrNull(await apiRequest<WeightEntry | null>(`/weight/by-date/${date}`));
}

export async function upsertWeightEntry(input: { date: string; weight_kg: number }): Promise<WeightEntry> {
  return toEntry(await apiRequest<WeightEntry>("/weight/upsert", "POST", input));
}

export async function updateWeightEntry(
  id: string,
  input: { date: string; weight_kg: number }
): Promise<WeightEntry> {
  return toEntry(await apiRequest<WeightEntry>(`/weight/${id}`, "PUT", input));
}

export async function deleteWeightEntry(id: string): Promise<void> {
  return apiRequest<void>(`/weight/${id}`, "DELETE");
}
