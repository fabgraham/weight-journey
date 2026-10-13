import type { WeightEntry } from "./types";
import { formatDisplayDate } from "../../shared/date";

export type WeightSearchResult = {
  supported: boolean;
  entries: WeightEntry[];
  answer: string;
};

const HELP = 'Try “When did I last weigh between 64 and 65kg?”, “Show weights below 70kg”, or “What was my lowest weight?”';
const PREFIX = String.raw`^(?:(?:when was|when is|when were) the (last|first) times? (?:my weight was|i weighed|i was) |(?:show|find|list)(?: me)? (?:all )?(?:my )?(?:weights|weight entries|entries)(?: where (?:my weight was|i weighed))? |(?:my )?(last|latest|first|earliest) (?:weight|entry)(?: was)? )?`;

// A deliberately bounded grammar: unsupported qualifiers must not silently change an answer.
export function searchWeights(entries: WeightEntry[], question: string): WeightSearchResult {
  const text = question.toLowerCase().trim().replace(/[?!.]+$/, "").replace(/\s+/g, " ")
    .replace(/^(?:find|show)(?: me)? when /, "when ")
    .replace(/(\d+(?:[.,]\d+)?)\s*(kg|kilograms?|kilos?)?\s+or (more|above|higher|less|below|lower)$/, (_, value, unit, direction) =>
      `${["more", "above", "higher"].includes(direction) ? "at least" : "at most"} ${value}${unit ?? ""}`)
    .replace(/^when (?:was|did) i (last|first) (?:weigh |weighed |was )?/, "$1 weight ")
    .replace(/^when i (last|first) (?:weigh |weighed |was )/, "$1 weight ")
    .replace(/^when was my weight (last|first) /, "$1 weight ");
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const extreme = text.match(/^(?:what (?:was|is) (?:my|the) |(?:show|find)(?: me)? (?:my|the) )?(lowest|highest|minimum|maximum)(?: recorded)? weight(?: ever)?$/);
  const comparison = text.match(new RegExp(PREFIX + String.raw`(more than|greater than|above|over|less than|below|under|at least|at most|equal to|exactly|>=|<=|>|<|=)\s*(\d+(?:[.,]\d+)?)\s*(?:kg|kilograms?|kilos?)?$`));
  const range = text.match(new RegExp(PREFIX + String.raw`between\s*(\d+(?:[.,]\d+)?)\s*(?:kg|kilograms?|kilos?)?\s+and\s+(\d+(?:[.,]\d+)?)\s*(?:kg|kilograms?|kilos?)?$`));
  const minimum = range ? Number(range[3].replace(",", ".")) : 0;
  const maximum = range ? Number(range[4].replace(",", ".")) : 0;
  if (range && (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum > maximum)) {
    return { supported: false, entries: [], answer: "Put the lower weight first, for example: between 64 and 65kg." };
  }

  if (!extreme && !comparison && !range) return { supported: false, entries: [], answer: HELP };
  if (!sorted.length) return { supported: true, entries: [], answer: "No weight entries yet. Log a weight to search your history." };

  if (extreme) {
    const lowest = ["lowest", "minimum"].includes(extreme[1]);
    const value = (lowest ? Math.min : Math.max)(...sorted.map((entry) => entry.weight_kg));
    const matches = sorted.filter((entry) => entry.weight_kg === value).reverse();
    return {
      supported: true,
      entries: matches,
      answer: `Your ${lowest ? "lowest" : "highest"} recorded weight was ${value} kg on ${formatDisplayDate(matches[0].date)}.${matches.length > 1 ? ` Recorded on ${matches.length} dates; all are highlighted.` : ""}`,
    };
  }

  const [, time, shortTime] = (range ?? comparison)!;
  const operator = comparison?.[3] ?? "";
  const value = comparison ? Number(comparison[4].replace(",", ".")) : 0;
  const predicates: Record<string, (weight: number) => boolean> = {
    "more than": (w) => w > value, "greater than": (w) => w > value,
    above: (w) => w > value, over: (w) => w > value, ">": (w) => w > value,
    "less than": (w) => w < value, below: (w) => w < value, under: (w) => w < value, "<": (w) => w < value,
    "at least": (w) => w >= value, ">=": (w) => w >= value,
    "at most": (w) => w <= value, "<=": (w) => w <= value,
    "equal to": (w) => w === value, exactly: (w) => w === value, "=": (w) => w === value,
  };
  const description = range ? `between ${minimum} and ${maximum} kg (inclusive)` : `${operator} ${value} kg`;
  const matches = sorted.filter((entry) => range
    ? entry.weight_kg >= minimum && entry.weight_kg <= maximum
    : predicates[operator](entry.weight_kg));
  if (!matches.length) return { supported: true, entries: [], answer: `No recorded weights ${description}.` };
  const order = time ?? shortTime;
  if (order) {
    const first = order === "first" || order === "earliest";
    const entry = first ? matches[0] : matches[matches.length - 1];
    return {
      supported: true, entries: [entry],
      answer: `The ${first ? "first" : "last"} recorded weight ${description} was ${entry.weight_kg} kg on ${formatDisplayDate(entry.date)}.`,
    };
  }
  return {
    supported: true, entries: matches.reverse(),
    answer: `Found ${matches.length} ${matches.length === 1 ? "entry" : "entries"} ${description}. Highlighted in the graph and listed below.`,
  };
}
