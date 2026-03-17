import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import {
  getWeightDomain,
  type WeightRange,
} from "../selectors";
import type { WeightEntry } from "../types";
import { formatDisplayDate } from "../../../shared/date";

type WeightTrendCardProps = {
  entries: WeightEntry[];
  range: WeightRange;
};

const CHART_WIDTH = 300;
const CHART_HEIGHT = 180;
const PADDING_X = 16;
const PADDING_Y = 12;
const GOAL_WEIGHT = 70;

function buildPath(entries: WeightEntry[]) {
  if (!entries.length) return "";

  const { min, max } = getWeightDomain(entries);
  const span = Math.max(max - min, 1);

  return entries
    .map((entry, index) => {
      const x =
        PADDING_X +
        (index / Math.max(entries.length - 1, 1)) * (CHART_WIDTH - PADDING_X * 2);
      const y =
        CHART_HEIGHT -
        PADDING_Y -
        ((entry.weight_kg - min) / span) * (CHART_HEIGHT - PADDING_Y * 2);

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getGoalY(entries: WeightEntry[]) {
  const { min, max } = getWeightDomain(entries);
  const span = Math.max(max - min, 1);
  return (
    CHART_HEIGHT -
    PADDING_Y -
    ((GOAL_WEIGHT - min) / span) * (CHART_HEIGHT - PADDING_Y * 2)
  );
}

export function WeightTrendCard({ entries, range }: WeightTrendCardProps) {
  const latest = entries.at(-1) ?? null;
  const path = buildPath(entries);
  const goalY = getGoalY(entries);

  return (
    <View className="mt-8 rounded-[26px] border border-[#ece5d9] bg-[#fffaf4] p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-semibold text-[#173126]">Trend</Text>
        <Text className="rounded-full bg-[#102d20] px-4 py-2 text-lg font-semibold text-white">
          {latest ? `${latest.weight_kg} kg` : "--"}
        </Text>
      </View>

      <Text className="mt-3 text-base text-[#4b5a51]">{range} range</Text>

      {entries.length ? (
        <>
          <View className="mt-5 overflow-hidden rounded-[24px] bg-white">
            <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
              <Rect x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} fill="#ffffff" />
              <Rect x="0" y="0" width="88" height={CHART_HEIGHT} fill="#f4f5fb" opacity="0.8" />
              <Line
                x1={PADDING_X}
                y1={goalY}
                x2={CHART_WIDTH - PADDING_X}
                y2={goalY}
                stroke="#243a31"
                strokeDasharray="6 6"
                strokeWidth="1.5"
              />
              <Path d={path} fill="none" stroke="#5079d4" strokeWidth="4" strokeLinecap="round" />
              {entries.map((entry, index) => {
                const { min, max } = getWeightDomain(entries);
                const span = Math.max(max - min, 1);
                const x =
                  PADDING_X +
                  (index / Math.max(entries.length - 1, 1)) * (CHART_WIDTH - PADDING_X * 2);
                const y =
                  CHART_HEIGHT -
                  PADDING_Y -
                  ((entry.weight_kg - min) / span) * (CHART_HEIGHT - PADDING_Y * 2);

                return <Circle key={entry.id} cx={x} cy={y} r="3.8" fill="#173126" />;
              })}
            </Svg>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-sm text-[#526056]">{entries[0] ? formatDisplayDate(entries[0].date) : ""}</Text>
            <Text className="text-sm text-[#526056]">Goal 70 kg</Text>
            <Text className="text-sm text-[#526056]">
              {entries.at(-1) ? formatDisplayDate(entries.at(-1)!.date) : ""}
            </Text>
          </View>
        </>
      ) : (
        <Text className="mt-4 text-sm text-[#6c6a63]">No weight entries yet.</Text>
      )}
    </View>
  );
}
