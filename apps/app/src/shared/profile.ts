import { apiRequest } from "./apiClient";

export type ProfileSettings = {
  id: number;
  height_m: number;
  created_at: string;
};

export async function getProfileSettings(): Promise<ProfileSettings | null> {
  return apiRequest<ProfileSettings | null>("/profile");
}
