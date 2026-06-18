import { apiRequest } from "../../shared/apiClient";
import type { WeightEntry } from "./types";

export async function listWeightEntries(): Promise<WeightEntry[]> {
  return apiRequest<WeightEntry[]>("/weight");
}

export async function listRecentWeightEntries(limit = 5): Promise<WeightEntry[]> {
  return apiRequest<WeightEntry[]>(`/weight/recent?limit=${limit}`);
}

export async function getWeightEntryById(id: string): Promise<WeightEntry | null> {
  return apiRequest<WeightEntry | null>(`/weight/${id}`);
}

export async function getWeightEntryByDate(date: string): Promise<WeightEntry | null> {
  return apiRequest<WeightEntry | null>(`/weight/by-date/${date}`);
}

export async function upsertWeightEntry(input: { date: string; weight_kg: number }): Promise<WeightEntry> {
  return apiRequest<WeightEntry>("/weight/upsert", "POST", input);
}

export async function updateWeightEntry(
  id: string,
  input: { date: string; weight_kg: number }
): Promise<WeightEntry> {
  return apiRequest<WeightEntry>(`/weight/${id}`, "PUT", input);
}

export async function deleteWeightEntry(id: string): Promise<void> {
  return apiRequest<void>(`/weight/${id}`, "DELETE");
}
