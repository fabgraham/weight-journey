import { Fragment, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";

import type { WeightRange } from "../selectors";
import type { WeightEntry } from "../types";
import { formatMonthYear, formatShortDisplayDate, toIsoDate } from "../../../shared/date";

type WeightTrendCardProps = {
  entries: WeightEntry[];
  range: WeightRange;
};

type Detail = "month" | "week" | "entry";

const DETAIL_OPTIONS: { value: Detail; label: string }[] = [
  { value: "month", label: "Monthly" },
  { value: "week", label: "Weekly" },
  { value: "entry", label: "Every entry" },
];

const CHART_HEIGHT = 240;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;
const PAD_LEFT = 12;
const PAD_RIGHT = 20;
const Y_AXIS_WIDTH = 32;
const TOOLTIP_SPACE = 52;
const TOOLTIP_WIDTH = 132;
const MIN_TICK_GAP = 52;
const WEEK_SPACING = 22;
const ENTRY_SPACING = 30;
const SCROLL_STEP = 20;
const GOAL_WEIGHT = 70;
const VISIBLE_WEEK_ROWS = 8;
const WEEK_ROW_HEIGHT = 38;
const DAY_MS = 24 * 60 * 60 * 1000;

const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "short" });
const dayMonthYearFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

type SeriesPoint = {
  key: string;
  time: number;
  weight: number;
  label: string;
};

type WeekBucket = {
  key: string;
  label: string;
  avg: number;
};

function toTime(date: string) {
  return new Date(`${date}T00:00:00`).getTime();
}

function weekStartKey(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return toIsoDate(d);
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function average(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function groupEntries(entries: WeightEntry[], keyOf: (date: string) => string) {
  const groups = new Map<string, WeightEntry[]>();
  for (const entry of entries) {
    const key = keyOf(entry.date);
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  return Array.from(groups);
}

function buildSeries(entries: WeightEntry[], detail: Detail): SeriesPoint[] {
  if (detail === "entry") {
    return entries.map((entry) => ({
      key: entry.id,
      time: toTime(entry.date),
      weight: entry.weight_kg,
      label: dayMonthYearFormat.format(new Date(toTime(entry.date))),
    }));
  }

  const keyOf = detail === "week" ? weekStartKey : monthKey;
  return groupEntries(entries, keyOf).map(([key, group]) => ({
    key,
    // Average of the entry dates, so a bucket sits where its data actually is.
    time: average(group.map((e) => toTime(e.date))),
    weight: Number(average(group.map((e) => e.weight_kg)).toFixed(1)),
    label:
      detail === "week"
        ? `w/c ${formatShortDisplayDate(key)}`
        : formatMonthYear(new Date(`${key}-01T00:00:00`)),
  }));
}

function getYScale(values: number[]) {
  if (!values.length) return { lo: 0, hi: 1, ticks: [] as number[] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const step = [1, 2, 5, 10, 20].find((s) => span / s <= 4) ?? 20;
  const lo = Math.floor(min / step) * step;
  const hi = Math.max(Math.ceil(max / step) * step, lo + step);
  const ticks: number[] = [];
  for (let kg = lo; kg <= hi; kg += step) ticks.push(kg);
  return { lo, hi, ticks };
}

function buildXTicks(tMin: number, tMax: number, xFor: (t: number) => number, width: number) {
  const candidates: { time: number; label: string; year?: number }[] = [];
  const cursor = new Date(tMin);
  cursor.setHours(0, 0, 0, 0);

  if ((tMax - tMin) / DAY_MS <= 45) {
    cursor.setDate(cursor.getDate() + ((8 - cursor.getDay()) % 7));
    for (; cursor.getTime() <= tMax; cursor.setDate(cursor.getDate() + 7)) {
      candidates.push({ time: cursor.getTime(), label: formatShortDisplayDate(toIsoDate(cursor)) });
    }
  } else {
    cursor.setDate(1);
    if (cursor.getTime() < tMin) cursor.setMonth(cursor.getMonth() + 1);
    for (; cursor.getTime() <= tMax; cursor.setMonth(cursor.getMonth() + 1)) {
      candidates.push({ time: cursor.getTime(), label: monthFormat.format(cursor), year: cursor.getFullYear() });
    }
  }

  const ticks: { x: number; label: string }[] = [];
  let lastX = -Infinity;
  let lastYear: number | undefined;
  for (const candidate of candidates) {
    const x = xFor(candidate.time);
    if (x < 18 || x > width - 18 || x - lastX < MIN_TICK_GAP) continue;
    // Year is added on the first visible month and whenever it changes, since thinning can drop January.
    const showYear = candidate.year !== undefined && candidate.year !== lastYear;
    const label = showYear ? `${candidate.label} '${String(candidate.year).slice(2)}` : candidate.label;
    ticks.push({ x, label });
    lastX = x;
    lastYear = candidate.year;
  }
  return ticks;
}

function buildChart(series: SeriesPoint[], width: number, visibleFrom: number | null, visibleWidth: number) {
  const tMin = series[0]?.time ?? 0;
  const tMax = series.at(-1)?.time ?? 0;
  const xFor = (t: number) =>
    tMax === tMin ? width / 2 : PAD_LEFT + ((t - tMin) / (tMax - tMin)) * (width - PAD_LEFT - PAD_RIGHT);
  const xs = series.map((p) => xFor(p.time));

  // When scrolled, fit the kg axis to the points on screen (plus one neighbour each side so edge segments stay in view).
  let scaleSeries = series;
  if (visibleFrom != null) {
    let first = xs.findIndex((x) => x >= visibleFrom);
    let last = -1;
    for (let i = xs.length - 1; i >= 0; i--) {
      if (xs[i] <= visibleFrom + visibleWidth) {
        last = i;
        break;
      }
    }
    if (first !== -1 && last >= first) {
      first = Math.max(0, first - 1);
      last = Math.min(series.length - 1, last + 1);
      scaleSeries = series.slice(first, last + 1);
    }
  }

  const yScale = getYScale(scaleSeries.map((p) => p.weight));
  const plotBottom = CHART_HEIGHT - PAD_BOTTOM;
  const yFor = (kg: number) => PAD_TOP + ((yScale.hi - kg) / (yScale.hi - yScale.lo)) * (plotBottom - PAD_TOP);

  const points = series.map((p, i) => ({ ...p, x: xs[i], y: yFor(p.weight) }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L ${points.at(-1)!.x} ${plotBottom} L ${points[0].x} ${plotBottom} Z`
    : "";

  return {
    points,
    linePath,
    areaPath,
    plotBottom,
    yTicks: yScale.ticks.map((kg) => ({ kg, y: yFor(kg) })),
    xTicks: buildXTicks(tMin, tMax, xFor, width),
    goalY: GOAL_WEIGHT >= yScale.lo && GOAL_WEIGHT <= yScale.hi ? yFor(GOAL_WEIGHT) : null,
  };
}

function buildWeekBuckets(entries: WeightEntry[]): WeekBucket[] {
  if (entries.length < 2) return [];
  return groupEntries(entries, weekStartKey)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, group]) => ({
      key,
      label: formatShortDisplayDate(key),
      avg: Number(average(group.map((e) => e.weight_kg)).toFixed(1)),
    }));
}

export function WeightTrendCard({ entries, range }: WeightTrendCardProps) {
  const [detail, setDetail] = useState<Detail>("month");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  // null = scrolled to the latest end.
  const [scrollX, setScrollX] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const isAllRange = range === "All";
  const effectiveDetail: Detail = isAllRange ? detail : "entry";
  const scrollable = isAllRange && detail !== "month";

  const series = useMemo(() => buildSeries(entries, effectiveDetail), [entries, effectiveDetail]);
  const contentWidth = scrollable
    ? Math.max(viewportWidth, series.length * (detail === "week" ? WEEK_SPACING : ENTRY_SPACING))
    : viewportWidth;
  const visibleFrom = scrollable ? (scrollX ?? Math.max(0, contentWidth - viewportWidth)) : null;
  const chart = useMemo(
    () => buildChart(series, contentWidth, visibleFrom, viewportWidth),
    [series, contentWidth, visibleFrom, viewportWidth]
  );

  const selected = chart.points.find((p) => p.key === selectedKey) ?? chart.points.at(-1) ?? null;
  const pointCount = chart.points.length;
  const showAllDots =
    pointCount <= 1 || (contentWidth - PAD_LEFT - PAD_RIGHT) / (pointCount - 1) >= 10;

  const weekBuckets = useMemo(() => buildWeekBuckets(entries), [entries]);

  if (!entries.length) {
    return (
      <View className="-mx-4 mt-6 rounded-[26px] border border-[#ece5d9] bg-[#fffaf4] p-5">
        <Text className="text-xl font-semibold text-[#173126]">Trend</Text>
        <Text className="mt-4 text-sm text-[#6c6a63]">No weight entries yet.</Text>
      </View>
    );
  }

  return (
    <View className="-mx-4 mt-6 rounded-[26px] border border-[#ece5d9] bg-[#fffaf4]">
      {/* Header */}
      <View className="px-4 pt-5">
        <Text className="text-xl font-semibold text-[#173126]">Trend</Text>
        <Text className="mt-0.5 text-sm text-[#4b5a51]">{range} range</Text>
      </View>

      {isAllRange ? (
        <View className="mx-4 mt-4 flex-row self-start rounded-full bg-[#efe9df] p-1">
          {DETAIL_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              className={`rounded-full px-4 py-1.5 ${detail === option.value ? "bg-white" : "bg-transparent"}`}
              onPress={() => {
                setDetail(option.value);
                setScrollX(null);
                setSelectedKey(null);
              }}
            >
              <Text className="text-xs font-semibold text-[#173126]">{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Line chart */}
      <View className="mt-3 flex-row">
        <View style={{ width: Y_AXIS_WIDTH, paddingTop: TOOLTIP_SPACE }}>
          <Svg width={Y_AXIS_WIDTH} height={CHART_HEIGHT}>
            <Rect x="0" y="0" width={Y_AXIS_WIDTH} height={CHART_HEIGHT} fill="#ffffff" />
            {chart.yTicks.map((tick) => (
              <SvgText
                key={tick.kg}
                x={Y_AXIS_WIDTH - 6}
                y={tick.y + 3.5}
                fontSize="10"
                fill="#7b7a74"
                textAnchor="end"
              >
                {tick.kg}
              </SvgText>
            ))}
          </Svg>
        </View>

        <View
          className="flex-1"
          style={{ height: TOOLTIP_SPACE + CHART_HEIGHT }}
          onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
        >
          {viewportWidth > 0 ? (
            <ScrollView
              ref={scrollRef}
              horizontal
              scrollEnabled={scrollable}
              showsHorizontalScrollIndicator={scrollable}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
              scrollEventThrottle={32}
              onScroll={(e) => setScrollX(Math.round(e.nativeEvent.contentOffset.x / SCROLL_STEP) * SCROLL_STEP)}
            >
              <View style={{ width: contentWidth, paddingTop: TOOLTIP_SPACE }}>
                {selected ? (
                  <View
                    className="absolute rounded-2xl bg-[#102d20] px-3 py-2"
                    style={{
                      top: 0,
                      width: TOOLTIP_WIDTH,
                      left: Math.max(4, Math.min(selected.x - TOOLTIP_WIDTH / 2, contentWidth - TOOLTIP_WIDTH - 4)),
                    }}
                  >
                    <Text className="text-base font-semibold text-white">{selected.weight.toFixed(1)} kg</Text>
                    <Text className="text-xs text-[#d8efe2]">{selected.label}</Text>
                  </View>
                ) : null}

                <Svg width={contentWidth} height={CHART_HEIGHT}>
                  <Defs>
                    <LinearGradient id="weightAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#5079d4" stopOpacity="0.18" />
                      <Stop offset="100%" stopColor="#5079d4" stopOpacity="0.01" />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width={contentWidth} height={CHART_HEIGHT} fill="#ffffff" />
                  {chart.yTicks.map((tick) => (
                    <Line
                      key={tick.kg}
                      x1={0}
                      y1={tick.y}
                      x2={contentWidth}
                      y2={tick.y}
                      stroke="#f0ebe3"
                      strokeWidth="1"
                    />
                  ))}
                  {chart.xTicks.map((tick) => (
                    <SvgText
                      key={`${tick.label}-${tick.x}`}
                      x={tick.x}
                      y={CHART_HEIGHT - 10}
                      fontSize="10"
                      fill="#7b7a74"
                      textAnchor="middle"
                    >
                      {tick.label}
                    </SvgText>
                  ))}
                  {chart.goalY != null ? (
                    <Line
                      x1={0}
                      y1={chart.goalY}
                      x2={contentWidth}
                      y2={chart.goalY}
                      stroke="#77a48f"
                      strokeDasharray="5 5"
                      strokeWidth="1.5"
                    />
                  ) : null}
                  <Path d={chart.areaPath} fill="url(#weightAreaFill)" />
                  <Path
                    d={chart.linePath}
                    fill="none"
                    stroke="#5079d4"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {selected ? (
                    <Line
                      x1={selected.x}
                      y1={selected.y}
                      x2={selected.x}
                      y2={chart.plotBottom}
                      stroke="#c8c3bb"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  ) : null}
                  {chart.points.map((point) => {
                    const isSelected = point.key === selected?.key;
                    if (!isSelected && !showAllDots) return null;
                    return (
                      <Fragment key={point.key}>
                        {isSelected ? (
                          <Circle cx={point.x} cy={point.y} r="10" fill="#5079d4" opacity="0.15" />
                        ) : null}
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={isSelected ? "5.5" : "3.5"}
                          fill={isSelected ? "#5079d4" : "#8ba8e8"}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? "2" : "1.5"}
                        />
                      </Fragment>
                    );
                  })}
                  {/* Full-height tap columns so points don't need precise taps. */}
                  {chart.points.map((point, i) => {
                    const prev = chart.points[i - 1];
                    const next = chart.points[i + 1];
                    const left = prev ? (prev.x + point.x) / 2 : 0;
                    const right = next ? (point.x + next.x) / 2 : contentWidth;
                    return (
                      <Rect
                        key={`hit-${point.key}`}
                        x={left}
                        y={0}
                        width={Math.max(right - left, 1)}
                        height={CHART_HEIGHT}
                        fill="transparent"
                        onPress={() => setSelectedKey(point.key)}
                      />
                    );
                  })}
                </Svg>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full bg-[#77a48f]" />
          <Text className="text-xs text-[#526056]">Goal {GOAL_WEIGHT} kg</Text>
        </View>
        {scrollable ? <Text className="text-xs text-[#526056]">Swipe chart to move through time</Text> : null}
      </View>

      {/* Weekly averages */}
      {weekBuckets.length >= 2 ? (
        <View className="border-t border-[#ece5d9] px-4 py-5">
          <View
            className="mb-2 flex-row items-baseline justify-between"
            style={weekBuckets.length > VISIBLE_WEEK_ROWS ? { paddingRight: 14 } : undefined}
          >
            <Text className="text-base font-semibold text-[#173126]">Weekly averages</Text>
            <Text className="text-xs text-[#8a8882]">vs week before</Text>
          </View>
          <ScrollView
            style={weekBuckets.length > VISIBLE_WEEK_ROWS ? { maxHeight: VISIBLE_WEEK_ROWS * WEEK_ROW_HEIGHT } : undefined}
            contentContainerStyle={weekBuckets.length > VISIBLE_WEEK_ROWS ? { paddingRight: 14 } : undefined}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {weekBuckets.map((bucket, i) => {
              const isLatest = i === 0;
              const previous = weekBuckets[i + 1];
              const change = previous ? Number((bucket.avg - previous.avg).toFixed(1)) : null;
              return (
                <View
                  key={bucket.key}
                  className="flex-row items-center border-b border-[#f0ebe2]"
                  style={{ height: WEEK_ROW_HEIGHT }}
                >
                  <Text className="w-16 text-xs text-[#526056]">{bucket.label}</Text>
                  <Text className={`flex-1 text-sm font-semibold ${isLatest ? "text-[#5079d4]" : "text-[#173126]"}`}>
                    {bucket.avg.toFixed(1)} kg
                  </Text>
                  {change == null ? (
                    <Text className="text-xs text-[#9a9890]">first</Text>
                  ) : (
                    <Text
                      className={`text-sm font-semibold ${change < 0 ? "text-[#77a48f]" : change > 0 ? "text-[#c0604a]" : "text-[#9a9890]"}`}
                    >
                      {change < 0 ? `−${Math.abs(change).toFixed(1)}` : change > 0 ? `+${change.toFixed(1)}` : "0.0"} kg
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
          {weekBuckets.length > VISIBLE_WEEK_ROWS ? (
            <Text className="mt-2 text-xs text-[#8a8882]">
              {weekBuckets.length} weeks · scroll for older weeks
            </Text>
          ) : null}
          <Text className="mt-3 text-xs text-[#8a8882]">Tap anywhere on the chart to inspect a point.</Text>
        </View>
      ) : null}
    </View>
  );
}
