import type { InjectionEntry } from "./types";

export function getInjectionCount(entries: InjectionEntry[]) {
  return entries.length;
}

export function getLatestInjection(entries: InjectionEntry[]) {
  return entries[0] ?? null;
}
