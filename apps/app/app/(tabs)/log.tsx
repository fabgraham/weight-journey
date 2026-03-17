import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  deleteInjectionEntry,
  getInjectionEntryById,
  createInjectionEntry,
  updateInjectionEntry,
} from "../../src/features/injections/api";
import { useInjectionsStore } from "../../src/features/injections/store";
import { INJECTION_DOSES, INJECTION_SITES } from "../../src/features/injections/types";
import {
  deleteWeightEntry,
  getWeightEntryByDate,
  getWeightEntryById,
  upsertWeightEntry,
  updateWeightEntry,
} from "../../src/features/weight/api";
import { useWeightStore } from "../../src/features/weight/store";
import { DateField } from "../../src/shared/ui/DateField";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [candidate.message, candidate.details, candidate.hint, candidate.code]
      .filter((value): value is string => typeof value === "string" && value.length > 0);

    if (parts.length) return parts.join(" | ");
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

async function confirmWeightOverwrite(date: string) {
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

export default function LogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const mode = params.type === "injection" ? "injection" : "weight";
  const loadWeightEntries = useWeightStore((s) => s.loadEntries);
  const loadInjectionEntries = useInjectionsStore((s) => s.loadEntries);

  const [weightValue, setWeightValue] = useState("");
  const [weightDate, setWeightDate] = useState(getToday());
  const [weightMessage, setWeightMessage] = useState<string | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightEditingId, setWeightEditingId] = useState<string | null>(null);

  const [injectionDate, setInjectionDate] = useState(getToday());
  const [injectionDose, setInjectionDose] = useState<number | null>(INJECTION_DOSES[0]);
  const [injectionSite, setInjectionSite] = useState<string>(INJECTION_SITES[0]);
  const [injectionMessage, setInjectionMessage] = useState<string | null>(null);
  const [injectionError, setInjectionError] = useState<string | null>(null);
  const [injectionSaving, setInjectionSaving] = useState(false);
  const [injectionEditingId, setInjectionEditingId] = useState<string | null>(null);
  const [loadingEditEntry, setLoadingEditEntry] = useState(false);

  const today = getToday();

  useEffect(() => {
    let cancelled = false;

    async function loadEditEntry() {
      if (!params.id || typeof params.id !== "string") return;

      setLoadingEditEntry(true);
      try {
        if (mode === "weight") {
          const entry = await getWeightEntryById(params.id);
          if (!cancelled && entry) {
            setWeightEditingId(entry.id);
            setWeightDate(entry.date);
            setWeightValue(String(entry.weight_kg));
          }
        }

        if (mode === "injection") {
          const entry = await getInjectionEntryById(params.id);
          if (!cancelled && entry) {
            setInjectionEditingId(entry.id);
            setInjectionDate(entry.date);
            setInjectionDose(entry.dose_mg);
            setInjectionSite(entry.site);
          }
        }
      } catch (error) {
        if (!cancelled) {
          const message = getErrorMessage(error, "Failed to load entry");
          if (mode === "weight") setWeightError(message);
          if (mode === "injection") setInjectionError(message);
        }
      } finally {
        if (!cancelled) setLoadingEditEntry(false);
      }
    }

    loadEditEntry();

    return () => {
      cancelled = true;
    };
  }, [mode, params.id]);

  const parsedWeight = Number(weightValue);
  const weightIsValid =
    weightValue.length > 0 &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 30 &&
    parsedWeight <= 300 &&
    weightDate.length > 0 &&
    weightDate <= today;

  const injectionIsValid =
    injectionDate.length > 0 &&
    injectionDate <= today &&
    injectionDose != null &&
    injectionSite.length > 0;

  const isEditingWeight = useMemo(() => Boolean(weightEditingId), [weightEditingId]);
  const isEditingInjection = useMemo(() => Boolean(injectionEditingId), [injectionEditingId]);

  async function refreshLists() {
    await Promise.all([loadWeightEntries(), loadInjectionEntries()]);
  }

  async function handleSaveWeight() {
    if (!weightIsValid) return;

    setWeightSaving(true);
    setWeightError(null);
    setWeightMessage(null);

    try {
      if (weightEditingId) {
        await updateWeightEntry(weightEditingId, { date: weightDate, weight_kg: parsedWeight });
        await refreshLists();
        router.replace("/");
        return;
      }

      const existingEntry = await getWeightEntryByDate(weightDate);
      if (existingEntry) {
        const shouldOverwrite = await confirmWeightOverwrite(weightDate);
        if (!shouldOverwrite) {
          setWeightSaving(false);
          return;
        }
      }

      await upsertWeightEntry({ date: weightDate, weight_kg: parsedWeight });
      await refreshLists();
      setWeightMessage("Weight entry saved.");
      setWeightValue("");
      setWeightDate(today);
    } catch (error) {
      setWeightError(getErrorMessage(error, "Failed to save weight entry"));
    } finally {
      setWeightSaving(false);
    }
  }

  async function handleDeleteWeight() {
    if (!weightEditingId) return;

    setWeightSaving(true);
    setWeightError(null);
    try {
      await deleteWeightEntry(weightEditingId);
      await refreshLists();
      router.replace("/");
    } catch (error) {
      setWeightError(getErrorMessage(error, "Failed to delete weight entry"));
    } finally {
      setWeightSaving(false);
    }
  }

  async function handleSaveInjection() {
    if (!injectionIsValid || injectionDose == null) return;

    setInjectionSaving(true);
    setInjectionError(null);
    setInjectionMessage(null);

    try {
      if (injectionEditingId) {
        await updateInjectionEntry(injectionEditingId, {
          date: injectionDate,
          dose_mg: injectionDose,
          site: injectionSite,
        });
        await refreshLists();
        router.replace("/injections");
        return;
      }

      await createInjectionEntry({
        date: injectionDate,
        dose_mg: injectionDose,
        site: injectionSite,
      });
      await refreshLists();
      setInjectionMessage("Injection entry saved.");
      setInjectionDate(today);
      setInjectionDose(INJECTION_DOSES[0]);
      setInjectionSite(INJECTION_SITES[0]);
    } catch (error) {
      setInjectionError(getErrorMessage(error, "Failed to save injection entry"));
    } finally {
      setInjectionSaving(false);
    }
  }

  async function handleDeleteInjection() {
    if (!injectionEditingId) return;

    setInjectionSaving(true);
    setInjectionError(null);
    try {
      await deleteInjectionEntry(injectionEditingId);
      await refreshLists();
      router.replace("/injections");
    } catch (error) {
      setInjectionError(getErrorMessage(error, "Failed to delete injection entry"));
    } finally {
      setInjectionSaving(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-[#f5f1ea]"
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 68, paddingBottom: 32 }}
    >
      <Text className="text-3xl font-semibold text-[#173126]">
        {mode === "weight" ? "Log weight" : "Log injection"}
      </Text>
      <Text className="mt-3 text-lg leading-7 text-[#4e5d54]">
        {mode === "weight"
          ? "Add or edit weight entries here."
          : "Add or edit injection entries here."}
      </Text>

      {loadingEditEntry ? (
        <View className="mt-8 items-start">
          <ActivityIndicator color="#173126" />
        </View>
      ) : null}

      {mode === "weight" ? (
        <View className="mt-8 rounded-[28px] bg-white px-6 py-7 shadow-sm">
          <Text className="text-2xl font-semibold text-[#173126]">
            {isEditingWeight ? "Edit weight" : "Log weight"}
          </Text>

          <DateField label="Date" value={weightDate} maxDate={today} onChange={setWeightDate} />

          <Text className="mt-5 text-sm font-semibold uppercase tracking-[1px] text-[#7b7a74]">Weight (kg)</Text>
          <TextInput
            value={weightValue}
            onChangeText={setWeightValue}
            placeholder="62.9"
            keyboardType="decimal-pad"
            className="mt-2 rounded-2xl bg-[#f8f5ef] px-4 py-4 text-lg text-[#173126]"
          />

          <Text className="mt-4 text-sm text-[#6b6f69]">
            Allowed range: 30 to 300 kg. Date cannot be in the future.
          </Text>

          {weightError ? <Text className="mt-4 text-sm text-red-500">{weightError}</Text> : null}
          {weightMessage ? <Text className="mt-4 text-sm text-[#3b7a5c]">{weightMessage}</Text> : null}

          <Pressable
            className={`mt-6 rounded-full px-6 py-5 ${weightIsValid && !weightSaving ? "bg-[#032414]" : "bg-[#8fa196]"}`}
            disabled={!weightIsValid || weightSaving}
            onPress={handleSaveWeight}
          >
            <Text className="text-center text-2xl font-semibold text-white">
              {weightSaving ? "Saving..." : isEditingWeight ? "Save weight changes" : "Save weight"}
            </Text>
          </Pressable>

          {isEditingWeight ? (
            <Pressable
              className="mt-4 rounded-full border-2 border-[#173126] bg-transparent px-6 py-5"
              disabled={weightSaving}
              onPress={handleDeleteWeight}
            >
              <Text className="text-center text-2xl font-semibold text-[#173126]">Delete weight entry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {mode === "injection" ? (
        <View className="mt-8 rounded-[28px] bg-white px-6 py-7 shadow-sm">
          <Text className="text-2xl font-semibold text-[#173126]">
            {isEditingInjection ? "Edit injection" : "Log injection"}
          </Text>

          <DateField label="Date" value={injectionDate} maxDate={today} onChange={setInjectionDate} />

          <Text className="mt-5 text-sm font-semibold uppercase tracking-[1px] text-[#7b7a74]">Dose</Text>
          <View className="mt-2 flex-row flex-wrap gap-3">
            {INJECTION_DOSES.map((dose) => (
              <Pressable
                key={dose}
                className={`rounded-full px-4 py-3 ${injectionDose === dose ? "bg-[#173126]" : "bg-[#f1ece3]"}`}
                onPress={() => setInjectionDose(dose)}
              >
                <Text className={`text-base font-semibold ${injectionDose === dose ? "text-white" : "text-[#173126]"}`}>
                  {dose} mg
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="mt-5 text-sm font-semibold uppercase tracking-[1px] text-[#7b7a74]">Site</Text>
          <View className="mt-2 gap-3">
            {INJECTION_SITES.map((site) => (
              <Pressable
                key={site}
                className={`rounded-2xl px-4 py-4 ${injectionSite === site ? "bg-[#173126]" : "bg-[#f8f5ef]"}`}
                onPress={() => setInjectionSite(site)}
              >
                <Text className={`text-base ${injectionSite === site ? "text-white" : "text-[#173126]"}`}>{site}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="mt-4 text-sm text-[#6b6f69]">All fields are required. Date cannot be in the future.</Text>

          {injectionError ? <Text className="mt-4 text-sm text-red-500">{injectionError}</Text> : null}
          {injectionMessage ? <Text className="mt-4 text-sm text-[#3b7a5c]">{injectionMessage}</Text> : null}

          <Pressable
            className={`mt-6 rounded-full px-6 py-5 ${injectionIsValid && !injectionSaving ? "bg-[#032414]" : "bg-[#8fa196]"}`}
            disabled={!injectionIsValid || injectionSaving}
            onPress={handleSaveInjection}
          >
            <Text className="text-center text-2xl font-semibold text-white">
              {injectionSaving ? "Saving..." : isEditingInjection ? "Save injection changes" : "Save injection"}
            </Text>
          </Pressable>

          {isEditingInjection ? (
            <Pressable
              className="mt-4 rounded-full border-2 border-[#173126] bg-transparent px-6 py-5"
              disabled={injectionSaving}
              onPress={handleDeleteInjection}
            >
              <Text className="text-center text-2xl font-semibold text-[#173126]">Delete injection entry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable
        className="mt-8 rounded-full border-2 border-[#173126] bg-transparent px-6 py-5"
        onPress={() => router.replace(mode === "weight" ? "/" : "/injections")}
      >
        <Text className="text-center text-2xl font-semibold text-[#173126]">
          {mode === "weight" ? "Back to weight" : "Back to injections"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
