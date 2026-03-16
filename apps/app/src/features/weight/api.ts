import { supabase } from "../../shared/supabase";
import type { WeightEntry } from "./types";

export async function listRecentWeightEntries(limit = 5): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id,date,weight_kg,created_at")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as WeightEntry[];
}

