import { Text, View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";

import { formatShortDisplayDate } from "../../../shared/date";
import type { InjectionEntry } from "../types";

type InjectionDoseChartProps = {
  entries: InjectionEntry[];
};

const CHART_WIDTH = 300;
const CHART_HEIGHT = 180;
const PADDING_X = 20;
const PADDING_Y = 20;

function getDoseColor(dose: number) {
  if (dose <= 2.5) return "#dcc88d";
  if (dose <= 5) return "#c9ab59";
  if (dose <= 7.5) return "#b78635";
  if (dose <= 10) return "#956117";
  return "#6e4307";
}

export function InjectionDoseChart({ entries }: InjectionDoseChartProps) {
  const latestEntries = entries.slice().reverse();
  const visibleEntries = latestEntries.length > 12 ? latestEntries.slice(0, 12) : latestEntries;
  const minDose = 2.5;
  const maxDose = 12.5;
  const span = maxDose - minDose;

  return (
    <View className="mt-8 rounded-[24px] bg-[#f8f5ef] p-5">
      <Text className="text-xl font-semibold text-[#173126]">Dose chart</Text>

      {visibleEntries.length ? (
        <>
          <View className="mt-5 overflow-hidden rounded-[24px] bg-white">
            <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
              <Rect x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} fill="#ffffff" />
              <Rect x="0" y="0" width="72" height={CHART_HEIGHT} fill="#faf5ea" opacity="0.9" />
              {[2.5, 5, 7.5, 10, 12.5].map((dose) => {
                const y =
                  CHART_HEIGHT -
                  PADDING_Y -
                  ((dose - minDose) / span) * (CHART_HEIGHT - PADDING_Y * 2);

                return (
                  <Line
                    key={dose}
                    x1={PADDING_X}
                    y1={y}
                    x2={CHART_WIDTH - PADDING_X}
                    y2={y}
                    stroke="#efe8dc"
                    strokeWidth="1"
                  />
                );
              })}

              {visibleEntries.map((entry, index) => {
                const x =
                  PADDING_X +
                  (index / Math.max(visibleEntries.length - 1, 1)) * (CHART_WIDTH - PADDING_X * 2);
                const barWidth = 12;
                const topY =
                  CHART_HEIGHT -
                  PADDING_Y -
                  ((entry.dose_mg - minDose) / span) * (CHART_HEIGHT - PADDING_Y * 2);
                const height = CHART_HEIGHT - PADDING_Y - topY;

                return (
                  <Rect
                    key={entry.id}
                    x={x - barWidth / 2}
                    y={topY}
                    width={barWidth}
                    height={height}
                    rx="6"
                    fill={getDoseColor(entry.dose_mg)}
                    stroke="#173126"
                    strokeWidth="1"
                  />
                );
              })}
            </Svg>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-sm text-[#526056]">
              {visibleEntries[0] ? formatShortDisplayDate(visibleEntries[0].date) : ""}
            </Text>
            <Text className="text-sm text-[#526056]">
              {visibleEntries.at(-1) ? formatShortDisplayDate(visibleEntries.at(-1)!.date) : ""}
            </Text>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-2">
            {[2.5, 5, 7.5, 10, 12.5].map((dose) => (
              <View key={dose} className="flex-row items-center gap-2">
                <View
                  style={{ backgroundColor: getDoseColor(dose) }}
                  className="h-3 w-3 rounded-full border border-[#173126]"
                />
                <Text className="text-sm text-[#314238]">{dose} mg</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text className="mt-4 text-sm text-[#6c6a63]">No injections yet.</Text>
      )}
    </View>
  );
}
