import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { formatDisplayDate, formatMonthYear, getDaysInMonth, toIsoDate } from "../date";

type DateFieldProps = {
  label: string;
  value: string;
  maxDate?: string;
  onChange: (value: string) => void;
};

const WEEK_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function startOfCalendarGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const jsDay = first.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function DateField({ label, value, maxDate, onChange }: DateFieldProps) {
  const initialDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  useEffect(() => {
    const next = value ? new Date(`${value}T00:00:00`) : new Date();
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [value]);

  const selectedValue = value || toIsoDate(new Date());
  const selectedDate = new Date(`${selectedValue}T00:00:00`);
  const max = maxDate ? new Date(`${maxDate}T00:00:00`) : null;

  const cells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const monthIndex = visibleMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, monthIndex);
    const offset = startOfCalendarGrid(year, monthIndex);
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - offset + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) return null;

      const date = new Date(year, monthIndex, dayNumber);
      return {
        iso: toIsoDate(date),
        label: String(dayNumber),
        disabled: max ? date > max : false,
      };
    });
  }, [max, visibleMonth]);

  return (
    <View>
      <Text className="mt-5 text-sm font-semibold uppercase tracking-[1px] text-[#7b7a74]">{label}</Text>
      <Pressable
        className="mt-2 rounded-2xl bg-[#f8f5ef] px-4 py-4"
        onPress={() => setOpen(true)}
      >
        <Text className="text-lg text-[#173126]">{formatDisplayDate(selectedValue)}</Text>
      </Pressable>

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/20 px-6">
          <View className="w-full max-w-[420px] rounded-[28px] bg-white p-6">
            <View className="flex-row items-center justify-between">
              <Pressable
                className="rounded-full bg-[#f3eee5] px-4 py-3"
                onPress={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                  )
                }
              >
                <Text className="text-base font-semibold text-[#173126]">Prev</Text>
              </Pressable>

              <Text className="text-xl font-semibold text-[#173126]">{formatMonthYear(visibleMonth)}</Text>

              <Pressable
                className="rounded-full bg-[#f3eee5] px-4 py-3"
                onPress={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                  )
                }
              >
                <Text className="text-base font-semibold text-[#173126]">Next</Text>
              </Pressable>
            </View>

            <View className="mt-6 flex-row justify-between">
              {WEEK_DAYS.map((day) => (
                <Text key={day} className="w-10 text-center text-sm font-semibold text-[#7b7a74]">
                  {day}
                </Text>
              ))}
            </View>

            <View className="mt-4 flex-row flex-wrap gap-y-2">
              {cells.map((cell, index) =>
                cell ? (
                  <Pressable
                    key={cell.iso}
                    className={`h-10 w-10 items-center justify-center rounded-full ${
                      cell.iso === selectedValue ? "bg-[#173126]" : "bg-transparent"
                    } ${cell.disabled ? "opacity-30" : ""}`}
                    disabled={cell.disabled}
                    onPress={() => {
                      onChange(cell.iso);
                      setOpen(false);
                    }}
                  >
                    <Text className={`text-base ${cell.iso === selectedValue ? "text-white" : "text-[#173126]"}`}>
                      {cell.label}
                    </Text>
                  </Pressable>
                ) : (
                  <View key={`empty-${index}`} className="h-10 w-10" />
                )
              )}
            </View>

            <Pressable
              className="mt-6 rounded-full border-2 border-[#173126] px-6 py-4"
              onPress={() => setOpen(false)}
            >
              <Text className="text-center text-lg font-semibold text-[#173126]">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
