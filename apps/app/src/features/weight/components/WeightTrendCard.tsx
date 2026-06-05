import { Fragment, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { getWeightDomain, type WeightRange } from "../selectors";
import type { WeightEntry } from "../types";
import { formatShortDisplayDate } from "../../../shared/date";

type WeightTrendCardProps = {
  entries: WeightEntry[];
  range: WeightRange;
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 240;
const PADDING_X = 20;
const PADDING_Y = 24;
const GOAL_WEIGHT = 70;

type ChartPoint = {
  entry: WeightEntry;
  x: number;
  y: number;
};

type WeekBucket = {
  label: string;
  avg: number;
};

function buildPath(entries: WeightEntry[], domain: { min: number; max: number }) {
  if (!entries.length) return "";
  const span = Math.max(domain.max - domain.min, 1);
  return entries
    .map((entry, index) => {
      const x = PADDING_X + (index / Math.max(entries.length - 1, 1)) * (CHART_WIDTH - PADDING_X * 2);
      const y = CHART_HEIGHT - PADDING_Y - ((entry.weight_kg - domain.min) / span) * (CHART_HEIGHT - PADDING_Y * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildAreaPath(entries: WeightEntry[], domain: { min: number; max: number }) {
  if (!entries.length) return "";
  const linePath = buildPath(entries, domain);
  const firstX = PADDING_X;
  const lastX = PADDING_X + (CHART_WIDTH - PADDING_X * 2);
  const bottomY = CHART_HEIGHT - PADDING_Y;
  return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
}

function getGoalY(domain: { min: number; max: number }) {
  const span = Math.max(domain.max - domain.min, 1);
  return CHART_HEIGHT - PADDING_Y - ((GOAL_WEIGHT - domain.min) / span) * (CHART_HEIGHT - PADDING_Y * 2);
}

function buildWeekBuckets(entries: WeightEntry[]): WeekBucket[] {
  if (entries.length < 2) return [];

  const buckets = new Map<string, number[]>();

  for (const entry of entries) {
    const d = new Date(`${entry.date}T00:00:00`);
    const day = d.getDay();
    const mondayOffset = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    const key = monday.toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(entry.weight_kg);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([key, weights]) => {
      const d = new Date(`${key}T00:00:00`);
      const label = `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}`;
      const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
      return { label, avg: Number(avg.toFixed(1)) };
    });
}

function getAvgWeeklyLoss(entries: WeightEntry[]): number | null {
  if (entries.length < 2) return null;
  const first = entries[0];
  const last = entries.at(-1)!;
  const days = Math.max(1, (new Date(`${last.date}T00:00:00`).getTime() - new Date(`${first.date}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24));
  const totalLoss = first.weight_kg - last.weight_kg;
  const weeks = days / 7;
  return Number((totalLoss / weeks).toFixed(2));
}

export function WeightTrendCard({ entries, range }: WeightTrendCardProps) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(entries.at(-1)?.id ?? null);

  const domain = useMemo(() => getWeightDomain(entries), [entries]);
  const path = useMemo(() => buildPath(entries, domain), [entries, domain]);
  const areaPath = useMemo(() => buildAreaPath(entries, domain), [entries, domain]);
  const goalY = useMemo(() => getGoalY(domain), [domain]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const span = Math.max(domain.max - domain.min, 1);
    return entries.map((entry, index) => {
      const x = PADDING_X + (index / Math.max(entries.length - 1, 1)) * (CHART_WIDTH - PADDING_X * 2);
      const y = CHART_HEIGHT - PADDING_Y - ((entry.weight_kg - domain.min) / span) * (CHART_HEIGHT - PADDING_Y * 2);
      return { entry, x, y };
    });
  }, [entries, domain]);

  const selectedPoint = chartPoints.find((p) => p.entry.id === selectedPointId) ?? chartPoints.at(-1) ?? null;
  const weekBuckets = useMemo(() => buildWeekBuckets(entries), [entries]);
  const avgWeeklyLoss = useMemo(() => getAvgWeeklyLoss(entries), [entries]);

  const bucketMin = weekBuckets.length ? Math.min(...weekBuckets.map((b) => b.avg)) : 0;
  const bucketMax = weekBuckets.length ? Math.max(...weekBuckets.map((b) => b.avg)) : 1;
  const bucketSpan = Math.max(bucketMax - bucketMin, 0.5);

  if (!entries.length) {
    return (
      <View className="mt-6 rounded-[26px] border border-[#ece5d9] bg-[#fffaf4] p-5">
        <Text className="text-xl font-semibold text-[#173126]">Trend</Text>
        <Text className="mt-4 text-sm text-[#6c6a63]">No weight entries yet.</Text>
      </View>
    );
  }

  return (
    <View className="mt-6 rounded-[26px] border border-[#ece5d9] bg-[#fffaf4]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-5">
        <View>
          <Text className="text-xl font-semibold text-[#173126]">Trend</Text>
          <Text className="mt-0.5 text-sm text-[#4b5a51]">{range} range</Text>
        </View>
        {avgWeeklyLoss != null ? (
          <View className="rounded-2xl bg-[#102d20] px-4 py-3">
            <Text className="text-xs text-[#d8efe2]">avg/week</Text>
            <Text className="mt-0.5 text-lg font-semibold text-white">
              {avgWeeklyLoss > 0 ? `−${avgWeeklyLoss}` : `+${Math.abs(avgWeeklyLoss)}`} kg
            </Text>
          </View>
        ) : null}
      </View>

      {/* Line chart */}
      <View className="mt-5 px-0">
        {selectedPoint ? (
          <View
            className="absolute z-10 ml-5 rounded-2xl bg-[#102d20] px-4 py-2"
            style={{
              left: Math.max(0, Math.min(selectedPoint.x - 52, CHART_WIDTH - 124)),
              top: 0,
            }}
          >
            <Text className="text-base font-semibold text-white">{selectedPoint.entry.weight_kg} kg</Text>
            <Text className="text-xs text-[#d8efe2]">{formatShortDisplayDate(selectedPoint.entry.date)}</Text>
          </View>
        ) : null}

        <View className="overflow-hidden bg-white" style={{ marginTop: 52 }}>
          <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
            <Defs>
              <LinearGradient id="weightAreaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#5079d4" stopOpacity="0.18" />
                <Stop offset="100%" stopColor="#5079d4" stopOpacity="0.01" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} fill="#ffffff" />
            {[0.25, 0.5, 0.75].map((step) => (
              <Line
                key={step}
                x1={PADDING_X}
                y1={PADDING_Y + step * (CHART_HEIGHT - PADDING_Y * 2)}
                x2={CHART_WIDTH - PADDING_X}
                y2={PADDING_Y + step * (CHART_HEIGHT - PADDING_Y * 2)}
                stroke="#f0ebe3"
                strokeWidth="1"
              />
            ))}
            {goalY > PADDING_Y && goalY < CHART_HEIGHT - PADDING_Y ? (
              <Line
                x1={PADDING_X}
                y1={goalY}
                x2={CHART_WIDTH - PADDING_X}
                y2={goalY}
                stroke="#77a48f"
                strokeDasharray="5 5"
                strokeWidth="1.5"
              />
            ) : null}
            <Path d={areaPath} fill="url(#weightAreaFill)" />
            <Path d={path} fill="none" stroke="#5079d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {selectedPoint ? (
              <Line
                x1={selectedPoint.x}
                y1={selectedPoint.y}
                x2={selectedPoint.x}
                y2={CHART_HEIGHT - PADDING_Y}
                stroke="#c8c3bb"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            ) : null}
            {chartPoints.map((point) => {
              const isSelected = point.entry.id === selectedPoint?.entry.id;
              return (
                <Fragment key={point.entry.id}>
                  {isSelected ? (
                    <Circle cx={point.x} cy={point.y} r="10" fill="#5079d4" opacity="0.15" />
                  ) : null}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r="18"
                    fill="transparent"
                    onPress={() => setSelectedPointId(point.entry.id)}
                  />
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? "5.5" : "3.5"}
                    fill={isSelected ? "#5079d4" : "#8ba8e8"}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? "2" : "1.5"}
                    onPress={() => setSelectedPointId(point.entry.id)}
                  />
                </Fragment>
              );
            })}
          </Svg>
        </View>

        <View className="flex-row items-center justify-between px-5 py-3">
          <Text className="text-xs text-[#526056]">
            {entries[0] ? formatShortDisplayDate(entries[0].date) : ""}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-[#77a48f]" />
            <Text className="text-xs text-[#526056]">Goal 70 kg</Text>
          </View>
          <Text className="text-xs text-[#526056]">
            {entries.at(-1) ? formatShortDisplayDate(entries.at(-1)!.date) : ""}
          </Text>
        </View>
      </View>

      {/* Weekly averages */}
      {weekBuckets.length >= 2 ? (
        <View className="border-t border-[#ece5d9] px-5 py-5">
          <Text className="mb-4 text-base font-semibold text-[#173126]">Weekly averages</Text>
          <View className="gap-2.5">
            {weekBuckets.map((bucket, i) => {
              const fillRatio = (bucket.avg - bucketMin) / bucketSpan;
              const isLast = i === weekBuckets.length - 1;
              return (
                <View key={bucket.label} className="flex-row items-center gap-3">
                  <Text className="w-14 text-xs text-[#526056]">{bucket.label}</Text>
                  <View className="h-7 flex-1 overflow-hidden rounded-full bg-[#ece8e0]">
                    <View
                      className={`h-full rounded-full ${isLast ? "bg-[#5079d4]" : "bg-[#a8bae8]"}`}
                      style={{ width: `${Math.max(6, fillRatio * 100)}%` }}
                    />
                  </View>
                  <Text className={`w-14 text-right text-xs font-semibold ${isLast ? "text-[#5079d4]" : "text-[#314238]"}`}>
                    {bucket.avg} kg
                  </Text>
                </View>
              );
            })}
          </View>
          <Text className="mt-3 text-xs text-[#8a8882]">
            Tap any data point on the chart to inspect date and weight.
          </Text>
        </View>
      ) : null}
    </View>
  );
}