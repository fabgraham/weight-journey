import { apiRequest } from "../../shared/apiClient";
import type { InjectionEntry } from "./types";

// Postgres NUMERIC columns arrive as strings (e.g. "2.5"); convert so comparisons and arithmetic work.
function toEntry(entry: InjectionEntry): InjectionEntry {
  return { ...entry, dose_mg: Number(entry.dose_mg) };
}

export async function listInjectionEntries(): Promise<InjectionEntry[]> {
  return (await apiRequest<InjectionEntry[]>("/injections")).map(toEntry);
}

export async function getInjectionEntryById(id: string): Promise<InjectionEntry | null> {
  const entry = await apiRequest<InjectionEntry | null>(`/injections/${id}`);
  return entry ? toEntry(entry) : null;
}

export async function createInjectionEntry(input: {
  date: string;
  dose_mg: number;
  site: string;
}): Promise<InjectionEntry> {
  return toEntry(await apiRequest<InjectionEntry>("/injections", "POST", input));
}

export async function updateInjectionEntry(
  id: string,
  input: { date: string; dose_mg: number; site: string }
): Promise<InjectionEntry> {
  return toEntry(await apiRequest<InjectionEntry>(`/injections/${id}`, "PUT", input));
}

export async function deleteInjectionEntry(id: string): Promise<void> {
  return apiRequest<void>(`/injections/${id}`, "DELETE");
}
