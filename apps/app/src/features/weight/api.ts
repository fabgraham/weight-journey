import { supabase } from "../../shared/supabase";
import type { WeightEntry } from "./types";

export async function listWeightEntries(): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id,date,weight_kg,created_at")
    .order("date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WeightEntry[];
}

export async function listRecentWeightEntries(limit = 5): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id,date,weight_kg,created_at")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as WeightEntry[];
}

export async function getWeightEntryById(id: string): Promise<WeightEntry | null> {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id,date,weight_kg,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as WeightEntry | null) ?? null;
}

export async function getWeightEntryByDate(date: string): Promise<WeightEntry | null> {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id,date,weight_kg,created_at")
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return (data as WeightEntry | null) ?? null;
}

export async function upsertWeightEntry(input: { date: string; weight_kg: number }) {
  const { data, error } = await supabase
    .from("weight_entries")
    .upsert(input, { onConflict: "date" })
    .select("id,date,weight_kg,created_at")
    .single();

  if (error) throw error;
  return data as WeightEntry;
}

export async function updateWeightEntry(id: string, input: { date: string; weight_kg: number }) {
  const { data, error } = await supabase
    .from("weight_entries")
    .update(input)
    .eq("id", id)
    .select("id,date,weight_kg,created_at")
    .single();

  if (error) throw error;
  return data as WeightEntry;
}

export async function deleteWeightEntry(id: string) {
  const { error } = await supabase
    .from("weight_entries")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
