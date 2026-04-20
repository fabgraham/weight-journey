import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  getInjectionCount,
  getLatestInjection,
} from "../../src/features/injections/selectors";
import { InjectionDoseChart } from "../../src/features/injections/components/InjectionDoseChart";
import { useInjectionsStore } from "../../src/features/injections/store";
import { formatDisplayDate } from "../../src/shared/date";
import { ProgressTopNav } from "../../src/shared/ui/ProgressTopNav";

export default function InjectionsScreen() {
  const router = useRouter();
  const [showAllEntries, setShowAllEntries] = useState(false);
  const entries = useInjectionsStore((s) => s.entries);
  const loading = useInjectionsStore((s) => s.loading);
  const error = useInjectionsStore((s) => s.error);
  const loadEntries = useInjectionsStore((s) => s.loadEntries);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const totalCount = getInjectionCount(entries);
  const latestInjection = getLatestInjection(entries);
  const visibleEntries = showAllEntries ? entries : entries.slice(0, 10);

  return (
    <ScrollView
      className="flex-1 bg-[#f5f1ea]"
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 68, paddingBottom: 32 }}
    >
      <ProgressTopNav active="injections" />

      <View className="mt-8 rounded-[28px] bg-white px-6 py-7 shadow-sm">
        <Text className="text-2xl font-semibold text-[#173126]">Injection History</Text>

        <View className="mt-6 flex-row gap-3">
          <View className="flex-1 rounded-[22px] bg-[#f8f5ef] p-4">
            <Text className="text-sm text-[#7b7a74]">Total injections</Text>
            <Text className="mt-2 text-3xl font-semibold text-[#173126]">{totalCount}</Text>
          </View>

          <View className="flex-1 rounded-[22px] bg-[#f8f5ef] p-4">
            <Text className="text-sm text-[#7b7a74]">Current dose</Text>
            <Text className="mt-2 text-3xl font-semibold text-[#173126]">
              {latestInjection ? `${latestInjection.dose_mg} mg` : "--"}
            </Text>
          </View>
        </View>

        <View className="mt-3 rounded-[22px] bg-[#f8f5ef] p-4">
          <Text className="text-sm text-[#7b7a74]">Last injection</Text>
          <Text className="mt-2 text-3xl font-semibold text-[#173126]">
            {latestInjection ? formatDisplayDate(latestInjection.date) : "--"}
          </Text>
        </View>

        <Pressable
          className="mt-6 rounded-full bg-[#032414] px-6 py-5"
          onPress={() => router.push({ pathname: "/log", params: { type: "injection" } })}
        >
          <Text className="text-center text-2xl font-semibold text-white">Log injection</Text>
        </Pressable>

        {!loading && !error ? <InjectionDoseChart entries={entries} /> : null}

        <View className="mt-8 rounded-[24px] bg-[#f8f5ef] p-5">
          <Text className="text-xl font-semibold text-[#173126]">Entries</Text>

          {loading ? (
            <View className="mt-4 items-start">
              <ActivityIndicator color="#173126" />
            </View>
          ) : error ? (
            <Text className="mt-4 text-sm text-red-500">{error}</Text>
          ) : (
            <View className="mt-4 gap-3">
              {visibleEntries.map((entry) => (
                <Pressable
                  key={entry.id}
                  className="flex-row items-start justify-between border-b border-[#efe8dc] py-5"
                  onPress={() =>
                    router.push({
                      pathname: "/log",
                      params: { type: "injection", id: entry.id },
                    })
                  }
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-2xl font-semibold text-[#173126]">{entry.dose_mg} mg</Text>
                    <Text className="mt-2 text-base text-[#314238]">{entry.site}</Text>
                    <Text className="mt-1 text-base text-[#314238]">{formatDisplayDate(entry.date)}</Text>
                  </View>

                  <Text className="pt-1 text-3xl leading-6 text-[#314238]">⋮</Text>
                </Pressable>
              ))}
              {entries.length > 10 && !showAllEntries ? (
                <Pressable
                  className="mt-2 rounded-full border-2 border-[#173126] bg-transparent px-6 py-5"
                  onPress={() => setShowAllEntries(true)}
                >
                  <Text className="text-center text-2xl font-semibold text-[#173126]">Load More</Text>
                </Pressable>
              ) : null}
              {!entries.length ? <Text className="text-sm text-[#6c6a63]">No injections yet.</Text> : null}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
