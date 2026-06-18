import { apiRequest } from "../../shared/apiClient";
import type { InjectionEntry } from "./types";

export async function listInjectionEntries(): Promise<InjectionEntry[]> {
  return apiRequest<InjectionEntry[]>("/injections");
}

export async function getInjectionEntryById(id: string): Promise<InjectionEntry | null> {
  return apiRequest<InjectionEntry | null>(`/injections/${id}`);
}

export async function createInjectionEntry(input: {
  date: string;
  dose_mg: number;
  site: string;
}): Promise<InjectionEntry> {
  return apiRequest<InjectionEntry>("/injections", "POST", input);
}

export async function updateInjectionEntry(
  id: string,
  input: { date: string; dose_mg: number; site: string }
): Promise<InjectionEntry> {
  return apiRequest<InjectionEntry>(`/injections/${id}`, "PUT", input);
}

export async function deleteInjectionEntry(id: string): Promise<void> {
  return apiRequest<void>(`/injections/${id}`, "DELETE");
}
