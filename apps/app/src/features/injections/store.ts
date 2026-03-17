import { create } from "zustand";

import { listInjectionEntries } from "./api";
import type { InjectionEntry } from "./types";

type InjectionsState = {
  entries: InjectionEntry[];
  loading: boolean;
  error: string | null;
  loadEntries: () => Promise<void>;
};

export const useInjectionsStore = create<InjectionsState>((set) => ({
  entries: [],
  loading: false,
  error: null,
  loadEntries: async () => {
    set({ loading: true, error: null });
    try {
      const entries = await listInjectionEntries();
      set({ entries, loading: false });
    } catch (e) {
      let message = "Failed to load injections";
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
      set({ loading: false, error: message });
    }
  },
}));
