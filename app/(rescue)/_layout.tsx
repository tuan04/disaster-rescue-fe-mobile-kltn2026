import { Tabs } from "expo-router";

export default function CitizenLayout() {
  return (
    <Tabs >
      <Tabs.Screen name="index" options={{ headerShown: false, title: "Home" }} />
    </Tabs>
  )
}