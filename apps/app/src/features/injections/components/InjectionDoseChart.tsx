import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { formatShortDisplayDate } from "../../../shared/date";
import type { InjectionEntry } from "../types";

type InjectionDoseChartProps = {
  entries: InjectionEntry[];
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 180;
const PADDING_X = 34;
const PADDING_Y = 20;

function getDoseColor(dose: number) {
  if (dose <= 2.5) return "#dcc88d";
  if (dose <= 5) return "#c9ab59";
  if (dose <= 7.5) return "#b78635";
  if (dose <= 10) return "#956117";
  return "#6e4307";
}

export function InjectionDoseChart({ entries }: InjectionDoseChartProps) {
  const visibleEntries = [...entries].reverse();
  const minDose = 0;
  const maxDose = 12.5;
  const span = maxDose - minDose;
  const barSpacing = (CHART_WIDTH - PADDING_X * 2) / Math.max(visibleEntries.length, 1);
  const barWidth = Math.max(10, Math.min(18, barSpacing * 0.52));
  const tickStep = Math.max(1, Math.ceil(visibleEntries.length / 5));
  const progressionPath = visibleEntries
    .map((entry, index) => {
      const x = PADDING_X + index * barSpacing + barSpacing / 2;
      const y =
        CHART_HEIGHT -
        PADDING_Y -
        ((entry.dose_mg - minDose) / span) * (CHART_HEIGHT - PADDING_Y * 2);

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const latestDose = entries[0]?.dose_mg ?? null;
  let phaseStartDate = entries[0]?.date ?? null;
  let phaseCount = 0;
  for (const entry of entries) {
    if (entry.dose_mg === latestDose) {
      phaseStartDate = entry.date;
      phaseCount += 1;
    } else {
      break;
    }
  }

  return (
    <View className="mt-8 rounded-[24px] bg-[#f8f5ef] p-5">
      <Text className="text-xl font-semibold text-[#173126]">Dose history</Text>
      <Text className="mt-2 text-sm text-[#5f6c64]">Full treatment journey across all injections.</Text>
      {latestDose != null && phaseStartDate ? (
        <View className="mt-4 rounded-2xl bg-white px-4 py-3">
          <Text className="text-sm font-medium text-[#5f6c64]">Current phase</Text>
          <Text className="mt-1 text-base font-semibold text-[#173126]">
            {latestDose} mg for {phaseCount} injections since {formatShortDisplayDate(phaseStartDate)}
          </Text>
        </View>
      ) : null}

      {visibleEntries.length ? (
        <>
          <View className="mt-5 overflow-hidden rounded-[24px] bg-white">
            <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
              <Rect x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} fill="#ffffff" />
              <Rect x="0" y="0" width="78" height={CHART_HEIGHT} fill="#faf5ea" opacity="0.9" />
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
              {[2.5, 5, 7.5, 10, 12.5].map((dose) => {
                const y =
                  CHART_HEIGHT -
                  PADDING_Y -
                  ((dose - minDose) / span) * (CHART_HEIGHT - PADDING_Y * 2);

                return (
                  <SvgText
                    key={`label-${dose}`}
                    x="10"
                    y={y + 4}
                    fontSize="11"
                    fill="#526056"
                  >
                    {dose}
                  </SvgText>
                );
              })}

              <Path
                d={progressionPath}
                fill="none"
                stroke="#173126"
                strokeOpacity="0.45"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {visibleEntries.map((entry, index) => {
                const x = PADDING_X + index * barSpacing + barSpacing / 2;
                const topY =
                  CHART_HEIGHT -
                  PADDING_Y -
                  ((entry.dose_mg - minDose) / span) * (CHART_HEIGHT - PADDING_Y * 2);
                const height = Math.max(8, CHART_HEIGHT - PADDING_Y - topY);

                return (
                  <Rect
                    key={entry.id}
                    x={x - barWidth / 2}
                    y={CHART_HEIGHT - PADDING_Y - height}
                    width={barWidth}
                    height={height}
                    rx="6"
                    fill={getDoseColor(entry.dose_mg)}
                    stroke="#173126"
                    strokeWidth="1"
                  />
                );
              })}
              {visibleEntries.map((entry, index) => {
                const x = PADDING_X + index * barSpacing + barSpacing / 2;
                const y =
                  CHART_HEIGHT -
                  PADDING_Y -
                  ((entry.dose_mg - minDose) / span) * (CHART_HEIGHT - PADDING_Y * 2);

                return (
                  <Circle
                    key={`point-${entry.id}`}
                    cx={x}
                    cy={y}
                    r="3.4"
                    fill="#173126"
                    stroke="#fff"
                    strokeWidth="1"
                  />
                );
              })}
              {visibleEntries.map((entry, index) => {
                if (index % tickStep !== 0 && index !== visibleEntries.length - 1) return null;
                const x = PADDING_X + index * barSpacing + barSpacing / 2;

                return (
                  <SvgText
                    key={`date-${entry.id}`}
                    x={x}
                    y={CHART_HEIGHT - 4}
                    fontSize="10"
                    fill="#526056"
                    textAnchor="middle"
                  >
                    {formatShortDisplayDate(entry.date)}
                  </SvgText>
                );
              })}
            </Svg>
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
