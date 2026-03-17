import { supabase } from "../../shared/supabase";
import type { InjectionEntry } from "./types";

export async function listInjectionEntries(): Promise<InjectionEntry[]> {
  const { data, error } = await supabase
    .from("injection_entries")
    .select("id,date,dose_mg,site,created_at")
    .order("date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as InjectionEntry[];
}

export async function getInjectionEntryById(id: string): Promise<InjectionEntry | null> {
  const { data, error } = await supabase
    .from("injection_entries")
    .select("id,date,dose_mg,site,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as InjectionEntry | null) ?? null;
}

export async function createInjectionEntry(input: { date: string; dose_mg: number; site: string }) {
  const { data, error } = await supabase
    .from("injection_entries")
    .insert(input)
    .select("id,date,dose_mg,site,created_at")
    .single();

  if (error) throw error;
  return data as InjectionEntry;
}

export async function updateInjectionEntry(
  id: string,
  input: { date: string; dose_mg: number; site: string }
) {
  const { data, error } = await supabase
    .from("injection_entries")
    .update(input)
    .eq("id", id)
    .select("id,date,dose_mg,site,created_at")
    .single();

  if (error) throw error;
  return data as InjectionEntry;
}

export async function deleteInjectionEntry(id: string) {
  const { error } = await supabase
    .from("injection_entries")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
