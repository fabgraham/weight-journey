import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { WeightSearchResult } from "../search";

type Props = {
  result: WeightSearchResult | null;
  disabled: boolean;
  searching?: boolean;
  onSearch: (question: string) => void;
  onClear: () => void;
};

export function WeightSearchCard({ result, disabled, searching = false, onSearch, onClear }: Props) {
  const [question, setQuestion] = useState("");
  function submit() {
    if (!disabled && question.trim()) onSearch(question.trim());
  }
  return (
    <View className="mt-6 rounded-[24px] bg-[#f8f5ef] px-5 py-5">
      <Text className="text-xl font-semibold text-[#173126]">Ask about your weight history</Text>
      <TextInput
        accessibilityLabel="Question about your weight history"
        value={question}
        onChangeText={setQuestion}
        placeholder="Last weight above 65kg"
        placeholderTextColor="#7b7a74"
        className="mt-4 rounded-2xl border border-[#d4cfc8] bg-white px-4 py-4 text-base text-[#173126]"
        returnKeyType="search"
        onSubmitEditing={submit}
        editable={!disabled}
        maxLength={500}
      />
      <View className="mt-3 flex-row flex-wrap gap-3">
        <Pressable accessibilityRole="button" disabled={disabled || !question.trim()} onPress={submit} className={`rounded-full px-5 py-3 ${disabled || !question.trim() ? "bg-[#8fa196]" : "bg-[#032414]"}`}>
          <Text className="font-semibold text-white">{searching ? "Searching…" : "Ask"}</Text>
        </Pressable>
        {result || searching ? <Pressable accessibilityRole="button" onPress={() => { setQuestion(""); onClear(); }} className="rounded-full border border-[#d4cfc8] px-5 py-3"><Text className="font-semibold text-[#173126]">Clear search</Text></Pressable> : null}
      </View>
      {result ? (
        <View accessibilityLiveRegion="polite" className="mt-4 rounded-2xl bg-[#e4ecfb] px-4 py-4">
          <Text className="text-sm font-semibold text-[#173126]">{result.supported ? "Answer" : "Try another question"}</Text>
          <Text className="mt-2 text-base leading-6 text-[#173126]">{result.answer}</Text>
          {result.comment ? (
            <View className="mt-3 border-t border-[#cbd7eb] pt-3">
              <Text className="text-sm font-semibold text-[#173126]">Claude’s comment</Text>
              <Text className="mt-2 text-base leading-6 text-[#173126]">{result.comment}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
