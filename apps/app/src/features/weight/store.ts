import { create } from "zustand";
import type { WeightEntry } from "./types";
import { listRecentWeightEntries } from "./api";

type WeightState = {
  recent: WeightEntry[];
  recentLoading: boolean;
  recentError: string | null;
  loadRecent: (limit?: number) => Promise<void>;
};

export const useWeightStore = create<WeightState>((set) => ({
  recent: [],
  recentLoading: false,
  recentError: null,
  loadRecent: async (limit = 5) => {
    set({ recentLoading: true, recentError: null });
    try {
      const recent = await listRecentWeightEntries(limit);
      set({ recent, recentLoading: false });
    } catch (e) {
      let message = "Failed to load weights";
      if (e && typeof e === "object") {
        const error = e as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
        const parts = [error.message, error.details, error.hint, error.code]
          .filter((value): value is string => typeof value === "string" && value.length > 0);

        if (parts.length) {
          message = parts.join(" | ");
        }
      } else if (e instanceof Error) {
        message = e.message;
      }
      set({ recentLoading: false, recentError: message });
    }
  },
}));
