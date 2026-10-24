import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { getWeightEntryByDate, upsertWeightEntry } from "../api";
import { confirmWeightOverwrite } from "../confirmOverwrite";
import { getLatestWeight } from "../selectors";
import { useWeightStore } from "../store";
import { formatDisplayDate, toIsoDate } from "../../../shared/date";
import { DateField } from "../../../shared/ui/DateField";

export function QuickLogWeight() {
  const inputRef = useRef<TextInput>(null);
  const loadEntries = useWeightStore((s) => s.loadEntries);
  const latestWeight = useWeightStore((s) => getLatestWeight(s.entries)?.weight_kg ?? null);
  const today = toIsoDate(new Date());
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasValue = value.trim().length > 0;
  const parsed = Number(value.replace(",", "."));
  const isValid = hasValue && Number.isFinite(parsed) && parsed >= 30 && parsed <= 300 && date <= today;

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  async function save() {
    if (!isValid || saving) return;
    setSaving(true);
    clearFeedback();
    try {
      if (await getWeightEntryByDate(date)) {
        if (!(await confirmWeightOverwrite(date))) return;
      }
      await upsertWeightEntry({ date, weight_kg: parsed });
      setValue("");
      setDate(today);
      setMessage(`Saved ${parsed} kg for ${date === today ? "today" : formatDisplayDate(date)}.`);
      await loadEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save weight entry");
    } finally {
      setSaving(false);
    }
  }

  function onPress() {
    if (hasValue) save();
    else inputRef.current?.focus();
  }

  const disabled = saving || (hasValue && !isValid);

  return (
    <View className="mt-8">
      <Text className="text-2xl font-semibold text-[#173126]">Log weight</Text>
      <View className="mt-4 rounded-[24px] bg-[#f8f5ef] px-5 pb-5">
        {/* Stacked on phones; date, weight and button side by side from the sm breakpoint (640px). */}
        <View className="sm:flex-row sm:items-end sm:gap-4">
          <View className="sm:flex-1">
            <DateField label="Date" value={date} maxDate={today} fieldClassName="border border-[#d4cfc8] bg-white" onChange={(next) => { setDate(next); clearFeedback(); }} />
          </View>
          <View className="sm:flex-1">
            <Text className="mt-5 text-sm font-semibold uppercase tracking-[1px] text-[#7b7a74]">Weight (kg)</Text>
            <TextInput
              ref={inputRef}
              accessibilityLabel="Weight in kg"
              value={value}
              onChangeText={(text) => { setValue(text); clearFeedback(); }}
              placeholder={latestWeight != null ? String(latestWeight) : "62.9"}
              placeholderTextColor="#9a9890"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={save}
              editable={!saving}
              maxLength={6}
              className="mt-2 rounded-2xl border border-[#d4cfc8] bg-white px-4 py-4 text-lg text-[#173126]"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={onPress}
            className={`mt-5 rounded-full px-8 py-4 sm:mt-0 ${disabled ? "bg-[#8fa196]" : "bg-[#032414]"}`}
          >
            <Text className="text-center text-xl font-semibold text-white">
              {saving ? "Saving…" : hasValue ? "Save" : "Log weight"}
            </Text>
          </Pressable>
        </View>
        {hasValue && !isValid ? (
          <Text className="mt-2 text-sm text-[#c0604a]">Enter a weight between 30 and 300 kg.</Text>
        ) : null}
        {error ? <Text className="mt-2 text-sm text-red-500">{error}</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" className="mt-2 text-sm text-[#77a48f]">{message}</Text> : null}
      </View>
    </View>
  );
}
