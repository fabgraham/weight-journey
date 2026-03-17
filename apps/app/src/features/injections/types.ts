export type InjectionEntry = {
  id: string;
  date: string;
  dose_mg: number;
  site: string;
  created_at: string;
};

export const INJECTION_DOSES = [2.5, 5, 7.5, 10, 12.5] as const;

export const INJECTION_SITES = [
  "Stomach - Lower left",
  "Stomach - Lower right",
  "Stomach - Upper left",
  "Stomach - Upper right",
  "Stomach - Lower mid",
  "Stomach - Upper mid",
  "Left thigh",
  "Right thigh",
  "Left arm",
  "Right arm",
] as const;
