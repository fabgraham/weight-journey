import { supabase } from "./supabase";

export type ProfileSettings = {
  id: number;
  height_m: number;
  created_at: string;
};

export async function getProfileSettings(): Promise<ProfileSettings | null> {
  const { data, error } = await supabase
    .from("profile_settings")
    .select("id,height_m,created_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  return (data as ProfileSettings | null) ?? null;
}
