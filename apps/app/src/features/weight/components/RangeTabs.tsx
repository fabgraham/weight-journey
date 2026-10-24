import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { isYearRange, type PresetRange, type WeightRange } from "../selectors";

const PRESETS: PresetRange[] = ["All", "1M", "3M", "6M", "1Y"];

type Props = {
  value: WeightRange;
  years: number[];
  onChange: (range: WeightRange) => void;
};

export function RangeTabs({ value, years, onChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const yearSelected = isYearRange(value);

  function select(range: WeightRange) {
    setMenuOpen(false);
    onChange(range);
  }

  return (
    // zIndex keeps the open year menu above the trend card that follows.
    <View className="mt-6 flex-row gap-1 sm:gap-5" style={{ zIndex: 10 }}>
      {/* Presets share the row equally on phones; natural widths from the sm breakpoint. */}
      {PRESETS.map((range) => (
        <Pressable
          key={range}
          accessibilityRole="button"
          className={`flex-1 items-center rounded-full py-3 sm:flex-none sm:px-5 ${value === range ? "bg-[#efe9df]" : "bg-transparent"}`}
          onPress={() => select(range)}
        >
          <Text className="text-base font-semibold text-[#173126] sm:text-lg">{range}</Text>
        </Pressable>
      ))}

      {years.length ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a year"
            className={`items-center rounded-full px-3 py-3 sm:px-5 ${yearSelected || menuOpen ? "bg-[#efe9df]" : "bg-transparent"}`}
            onPress={() => setMenuOpen((open) => !open)}
          >
            <Text className="text-base font-semibold text-[#173126] sm:text-lg">
              {yearSelected ? value : "Year"} ▾
            </Text>
          </Pressable>

          {menuOpen ? (
            <View className="absolute right-0 top-full mt-2 min-w-[120px] rounded-2xl border border-[#e4ddd2] bg-white py-2 shadow-sm">
              {years.map((year) => (
                <Pressable
                  key={year}
                  accessibilityRole="button"
                  className={`px-5 py-3 ${value === String(year) ? "bg-[#efe9df]" : ""}`}
                  onPress={() => select(`${year}`)}
                >
                  <Text className="text-base font-semibold text-[#173126]">{year}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
