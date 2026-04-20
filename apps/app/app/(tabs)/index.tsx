import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { WeightTrendCard } from "../../src/features/weight/components/WeightTrendCard";
import {
  getBmi,
  getDaysOnJourney,
  getFilteredWeights,
  getLatestWeight,
  getTotalLost,
  getVisibleWeights,
  getWeightChangePercent,
  type WeightRange,
} from "../../src/features/weight/selectors";
import { formatDisplayDate } from "../../src/shared/date";
import { getProfileSettings } from "../../src/shared/profile";
import { ProgressTopNav } from "../../src/shared/ui/ProgressTopNav";
import { useWeightStore } from "../../src/features/weight/store";

export default function DashboardScreen() {
  const router = useRouter();
  const [selectedRange, setSelectedRange] = useState<WeightRange>("All");
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [heightMetres, setHeightMetres] = useState<number | null>(null);
  const entries = useWeightStore((s) => s.entries);
  const entriesLoading = useWeightStore((s) => s.entriesLoading);
  const entriesError = useWeightStore((s) => s.entriesError);
  const loadEntries = useWeightStore((s) => s.loadEntries);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const profile = await getProfileSettings();
        if (!cancelled) {
          setHeightMetres(profile?.height_m ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setHeightMetres(null);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentWeight = getLatestWeight(entries)?.weight_kg ?? null;
  const totalLost = getTotalLost(entries);
  const weightChangePercent = getWeightChangePercent(entries);
  const bmi = getBmi(entries, heightMetres);
  const daysOnJourney = getDaysOnJourney(entries);
  const filteredEntries = getFilteredWeights(entries, selectedRange);
  const visibleEntries = getVisibleWeights(filteredEntries, selectedRange, showAllEntries);

  useEffect(() => {
    setShowAllEntries(false);
  }, [selectedRange]);

  return (
    <ScrollView
      className="flex-1 bg-[#f5f1ea]"
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 68, paddingBottom: 32 }}
    >
      <ProgressTopNav active="weight" />

      <View className="mt-8 rounded-[28px] bg-white px-6 py-7 shadow-sm">
        <Text className="text-2xl font-semibold text-[#173126]">Weight History</Text>

        {!entriesLoading && !entriesError ? (
          <View className="mt-6 flex-row flex-wrap justify-between gap-y-4">
            <View className="w-[48%] rounded-[24px] bg-[#faf8f3] px-5 py-5">
              <Text className="text-lg text-[#173126]">Start weight</Text>
              <Text className="mt-2 text-4xl font-semibold text-[#173126]">102 kg</Text>
            </View>

            <View className="w-[48%] rounded-[24px] bg-[#faf8f3] px-5 py-5">
              <Text className="text-lg text-[#173126]">Current</Text>
              <Text className="mt-2 text-4xl font-semibold text-[#173126]">
                {currentWeight != null ? `${currentWeight} kg` : "--"}
              </Text>
              <Text className="mt-2 text-base text-[#77a48f]">
                {weightChangePercent != null ? `Down ${weightChangePercent}%` : ""}
              </Text>
            </View>

            <View className="w-[48%] rounded-[24px] bg-[#faf8f3] px-5 py-5">
              <Text className="text-lg text-[#173126]">Your BMI</Text>
              <Text className="mt-2 text-4xl font-semibold text-[#173126]">{bmi != null ? bmi : "--"}</Text>
            </View>

            <View className="w-[48%] rounded-[24px] bg-[#faf8f3] px-5 py-5">
              <Text className="text-lg text-[#173126]">Goal</Text>
              <Text className="mt-2 text-4xl font-semibold text-[#173126]">70 kg</Text>
            </View>

            <View className="w-[48%] rounded-[24px] bg-[#faf8f3] px-5 py-5">
              <Text className="text-lg text-[#173126]">Days on journey</Text>
              <Text className="mt-2 text-4xl font-semibold text-[#173126]">{daysOnJourney}</Text>
            </View>
          </View>
        ) : null}

        <Pressable
          className="mt-6 rounded-full bg-[#032414] px-6 py-5"
          onPress={() => router.push({ pathname: "/log", params: { type: "weight" } })}
        >
          <Text className="text-center text-2xl font-semibold text-white">Log weight</Text>
        </Pressable>

        <View className="mt-6 flex-row gap-5">
          {["All", "1m", "3m", "6m"].map((range) => (
            <Pressable
              key={range}
              className={`rounded-full px-5 py-3 ${selectedRange === range ? "bg-[#efe9df]" : "bg-transparent"}`}
              onPress={() => setSelectedRange(range as WeightRange)}
            >
              <Text className="text-lg font-semibold text-[#173126]">{range}</Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-8 rounded-[24px] bg-[#f8f5ef] px-5 py-6">
          {entriesLoading ? (
            <View className="items-start">
              <ActivityIndicator color="#173126" />
            </View>
          ) : entriesError ? (
            <Text className="text-sm text-red-500">{entriesError}</Text>
          ) : (
            <>
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-sm uppercase tracking-[1px] text-[#7b7a74]">Current</Text>
                  <Text className="mt-2 text-5xl font-semibold text-[#102d20]">
                    {currentWeight != null ? `${currentWeight}` : "--"}
                    <Text className="text-2xl"> kg</Text>
                  </Text>
                </View>

                <View className="rounded-2xl bg-[#102d20] px-4 py-3">
                  <Text className="text-xl font-semibold text-white">
                    {totalLost != null ? `${totalLost} kg lost` : "No data"}
                  </Text>
                </View>
              </View>

              <View className="mt-8 border-t border-[#e4ddd2] pt-5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-[#173126]">Recent entries</Text>
                  <Text className="text-sm text-[#7b7a74]">Goal 70 kg</Text>
                </View>

                <View className="mt-4 gap-3">
                  {visibleEntries.map((e) => (
                    <Pressable
                      key={e.id}
                      className="flex-row items-start justify-between border-b border-[#efe8dc] py-5"
                      onPress={() =>
                        router.push({
                          pathname: "/log",
                          params: { type: "weight", id: e.id },
                        })
                      }
                    >
                      <View className="flex-1 pr-4">
                        <Text className="text-2xl font-semibold text-[#173126]">{e.weight_kg} kg</Text>
                        <Text className="mt-2 text-base text-[#314238]">{formatDisplayDate(e.date)}</Text>
                      </View>

                      <Text className="pt-1 text-3xl leading-6 text-[#314238]">⋮</Text>
                    </Pressable>
                  ))}
                  {selectedRange === "All" && filteredEntries.length > 12 && !showAllEntries ? (
                    <Pressable
                      className="mt-2 rounded-full border-2 border-[#173126] bg-transparent px-6 py-5"
                      onPress={() => setShowAllEntries(true)}
                    >
                      <Text className="text-center text-2xl font-semibold text-[#173126]">Load More</Text>
                    </Pressable>
                  ) : null}
                  {selectedRange === "3m" && filteredEntries.length > 8 && !showAllEntries ? (
                    <Pressable
                      className="mt-2 rounded-full border-2 border-[#173126] bg-transparent px-6 py-5"
                      onPress={() => setShowAllEntries(true)}
                    >
                      <Text className="text-center text-2xl font-semibold text-[#173126]">Load More</Text>
                    </Pressable>
                  ) : null}
                  {selectedRange === "6m" && filteredEntries.length > 12 && !showAllEntries ? (
                    <Pressable
                      className="mt-2 rounded-full border-2 border-[#173126] bg-transparent px-6 py-5"
                      onPress={() => setShowAllEntries(true)}
                    >
                      <Text className="text-center text-2xl font-semibold text-[#173126]">Load More</Text>
                    </Pressable>
                  ) : null}
                  {!visibleEntries.length ? (
                    <Text className="text-sm text-[#6c6a63]">No entries yet.</Text>
                  ) : null}
                </View>
              </View>
            </>
          )}
        </View>

        {!entriesLoading && !entriesError ? <WeightTrendCard entries={filteredEntries} range={selectedRange} /> : null}
      </View>
    </ScrollView>
  );
}
