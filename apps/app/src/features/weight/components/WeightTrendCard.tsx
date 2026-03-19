import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import {
  getWeightDomain,
  type WeightRange,
} from "../selectors";
import type { WeightEntry } from "../types";
import { formatDisplayDate, formatShortDisplayDate } from "../../../shared/date";

type WeightTrendCardProps = {
  entries: WeightEntry[];
  range: WeightRange;
};

const CHART_WIDTH = 300;
const CHART_HEIGHT = 180;
const PADDING_X = 16;
const PADDING_Y = 20;
const GOAL_WEIGHT = 70;

type ChartPoint = {
  entry: WeightEntry;
  x: number;
  y: number;
};

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

function buildAreaPath(entries: WeightEntry[]) {
  if (!entries.length) return "";
  const linePath = buildPath(entries);
  const firstX = PADDING_X;
  const lastX = PADDING_X + (CHART_WIDTH - PADDING_X * 2);
  const bottomY = CHART_HEIGHT - PADDING_Y;

  return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
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
  const [selectedPointId, setSelectedPointId] = useState<string | null>(entries.at(-1)?.id ?? null);
  const latest = entries.at(-1) ?? null;
  const path = buildPath(entries);
  const areaPath = buildAreaPath(entries);
  const goalY = getGoalY(entries);
  const chartPoints = useMemo<ChartPoint[]>(() => {
    const { min, max } = getWeightDomain(entries);
    const span = Math.max(max - min, 1);

    return entries.map((entry, index) => {
      const x =
        PADDING_X +
        (index / Math.max(entries.length - 1, 1)) * (CHART_WIDTH - PADDING_X * 2);
      const y =
        CHART_HEIGHT -
        PADDING_Y -
        ((entry.weight_kg - min) / span) * (CHART_HEIGHT - PADDING_Y * 2);

      return { entry, x, y };
    });
  }, [entries]);
  const selectedPoint = chartPoints.find((point) => point.entry.id === selectedPointId) ?? chartPoints.at(-1) ?? null;

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
          <View className="mt-5">
            {selectedPoint ? (
              <View
                className="absolute z-10 rounded-2xl bg-[#102d20] px-4 py-3"
                style={{
                  left: Math.max(12, Math.min(selectedPoint.x - 52, CHART_WIDTH - 124)),
                  top: 0,
                }}
              >
                <Text className="text-lg font-semibold text-white">{selectedPoint.entry.weight_kg} kg</Text>
                <Text className="mt-1 text-xs text-[#d8efe2]">{formatShortDisplayDate(selectedPoint.entry.date)}</Text>
              </View>
            ) : null}
            <View className="overflow-hidden rounded-[24px] bg-white" style={{ marginTop: 60 }}>
              <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
                <Defs>
                  <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#8ba5ea" stopOpacity="0.25" />
                    <Stop offset="100%" stopColor="#8ba5ea" stopOpacity="0.02" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} fill="#ffffff" />
                <Rect x="0" y="0" width="88" height={CHART_HEIGHT} fill="#f4f5fb" opacity="0.8" />
                {[0.25, 0.5, 0.75].map((step) => (
                  <Line
                    key={step}
                    x1={PADDING_X}
                    y1={PADDING_Y + step * (CHART_HEIGHT - PADDING_Y * 2)}
                    x2={CHART_WIDTH - PADDING_X}
                    y2={PADDING_Y + step * (CHART_HEIGHT - PADDING_Y * 2)}
                    stroke="#efe8dc"
                    strokeWidth="1"
                  />
                ))}
                <Line
                  x1={PADDING_X}
                  y1={goalY}
                  x2={CHART_WIDTH - PADDING_X}
                  y2={goalY}
                  stroke="#243a31"
                  strokeDasharray="6 6"
                  strokeWidth="1.5"
                />
                <Path d={areaPath} fill="url(#weightArea)" />
                <Path d={path} fill="none" stroke="#5079d4" strokeWidth="4" strokeLinecap="round" />
                {selectedPoint ? (
                  <Line
                    x1={selectedPoint.x}
                    y1={selectedPoint.y}
                    x2={selectedPoint.x}
                    y2={CHART_HEIGHT - PADDING_Y}
                    stroke="#d7d1c7"
                    strokeWidth="1.5"
                  />
                ) : null}
              {chartPoints.map((point) => {
                const isSelected = point.entry.id === selectedPoint?.entry.id;
                return (
                  <>
                    {isSelected ? (
                      <Circle
                        key={`${point.entry.id}-halo`}
                        cx={point.x}
                        cy={point.y}
                        r="9"
                        fill="#5079d4"
                        opacity="0.16"
                      />
                    ) : null}
                    <Circle
                      key={point.entry.id}
                      cx={point.x}
                      cy={point.y}
                      r={isSelected ? "6" : "4.6"}
                      fill="#173126"
                      stroke={isSelected ? "#5079d4" : "#ffffff"}
                      strokeWidth={isSelected ? "2.4" : "1.4"}
                    />
                  </>
                );
              })}
            </Svg>
            <View className="absolute inset-0">
              {chartPoints.map((point) => (
                <Pressable
                  key={point.entry.id}
                  onPress={() => setSelectedPointId(point.entry.id)}
                  style={{
                    position: "absolute",
                    left: point.x - 22,
                    top: point.y - 22,
                    width: 44,
                    height: 44,
                  }}
                />
              ))}
            </View>
          </View>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-[#526056]">{entries[0] ? formatShortDisplayDate(entries[0].date) : ""}</Text>
              <Text className="text-sm text-[#526056]">Goal 70 kg</Text>
              <Text className="text-sm text-[#526056]">
                {entries.at(-1) ? formatShortDisplayDate(entries.at(-1)!.date) : ""}
              </Text>
            </View>
            <View className="mt-4 flex-row items-center gap-5">
              <View className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full bg-[#5079d4]" />
                <Text className="text-sm font-medium text-[#314238]">Trendline</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full bg-[#173126]" />
                <Text className="text-sm font-medium text-[#314238]">Entries</Text>
              </View>
            </View>
            <Text className="mt-3 text-sm text-[#6a7068]">Tap any data point to inspect the exact date and weight.</Text>
          </View>
        </>
      ) : (
        <Text className="mt-4 text-sm text-[#6c6a63]">No weight entries yet.</Text>
      )}
    </View>
  );
}
