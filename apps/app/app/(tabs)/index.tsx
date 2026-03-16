import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useWeightStore } from "../../src/features/weight/store";

export default function DashboardScreen() {
  const recent = useWeightStore((s) => s.recent);
  const recentLoading = useWeightStore((s) => s.recentLoading);
  const recentError = useWeightStore((s) => s.recentError);
  const loadRecent = useWeightStore((s) => s.loadRecent);

  useEffect(() => {
    loadRecent(5);
  }, [loadRecent]);

  return (
    <View className="flex-1 bg-[#1a1a1f] px-6 pt-16">
      <Text className="text-2xl font-semibold text-[#f3f2ee]">Dashboard</Text>

      <View className="mt-8 rounded-xl bg-[#26262d] p-4">
        <Text className="text-base font-semibold text-[#f3f2ee]">Recent weights</Text>

        {recentLoading ? (
          <View className="mt-4 items-start">
            <ActivityIndicator color="#1D9E75" />
          </View>
        ) : recentError ? (
          <Text className="mt-4 text-sm text-red-300">{recentError}</Text>
        ) : (
          <View className="mt-4 gap-2">
            {recent.map((e) => (
              <View key={e.id} className="flex-row items-center justify-between">
                <Text className="text-sm text-[#c8c6bf]">{e.date}</Text>
                <Text className="text-sm font-semibold text-[#f3f2ee]">{e.weight_kg} kg</Text>
              </View>
            ))}
            {!recent.length ? <Text className="text-sm text-[#c8c6bf]">No entries yet.</Text> : null}
          </View>
        )}
      </View>
    </View>
  );
}
