import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="injections" options={{ title: "Injections" }} />
      <Tabs.Screen name="log" options={{ title: "Log" }} />
    </Tabs>
  );
}
