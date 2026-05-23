import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

interface Props {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  testID?: string;
}

/** Editable bullet list for tour package policy fields (inclusions, exclusions, etc.). */
export function PolicyListEditor({
  title,
  items,
  onChange,
  placeholder = "Add item…",
  testID,
}: Props) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, text]);
    setDraft("");
  }

  function updateItem(index: number, text: string) {
    onChange(items.map((item, i) => (i === index ? text : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <View testID={testID}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item, index) => (
        <View key={`${title}-${index}`} style={styles.row}>
          <TextInput
            testID={testID ? `${testID}-item-${index}` : undefined}
            style={styles.input}
            value={item}
            onChangeText={(text) => updateItem(index, text)}
            placeholder={placeholder}
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
          <Pressable
            testID={testID ? `${testID}-remove-${index}` : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${title} item ${index + 1}`}
            onPress={() => removeItem(index)}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={Colors.error} />
          </Pressable>
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput
          testID={testID ? `${testID}-draft` : undefined}
          style={[styles.input, styles.addInput]}
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          onSubmitEditing={addItem}
          returnKeyType="done"
        />
        <Pressable
          testID={testID ? `${testID}-add` : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Add ${title} item`}
          style={styles.addBtn}
          onPress={addItem}
        >
          <Ionicons name="add" size={20} color={Colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    minHeight: 40,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addInput: {
    flex: 1,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
});
