import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

type ProgressTopNavProps = {
  active: "weight" | "injections";
};

export function ProgressTopNav({ active }: ProgressTopNavProps) {
  const router = useRouter();

  return (
    <View className="flex-row gap-4">
        <Pressable
          className={`rounded-full px-7 py-4 ${active === "weight" ? "bg-[#e5dfd6]" : "bg-transparent"}`}
          onPress={() => router.replace("/")}
        >
          <Text className="text-xl font-semibold text-[#173126]">Weight</Text>
        </Pressable>

        <Pressable
          className={`rounded-full px-7 py-4 ${active === "injections" ? "bg-[#e5dfd6]" : "bg-transparent"}`}
          onPress={() => router.replace("/injections")}
        >
          <Text className="text-xl font-semibold text-[#173126]">Injections</Text>
        </Pressable>
    </View>
  );
}
