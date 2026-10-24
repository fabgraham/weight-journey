import { Alert, Platform } from "react-native";

export async function confirmWeightOverwrite(date: string) {
  const message = `A weight entry for ${date} already exists. Do you want to overwrite it?`;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.confirm(message);
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert("Overwrite weight entry", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Overwrite", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
