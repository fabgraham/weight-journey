import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#1a1a1f", borderTopColor: "#2a2a32" },
        tabBarActiveTintColor: "#1D9E75",
        tabBarInactiveTintColor: "#8d8a80",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="injections" options={{ title: "Injections" }} />
      <Tabs.Screen name="log" options={{ title: "Log" }} />
    </Tabs>
  );
}

