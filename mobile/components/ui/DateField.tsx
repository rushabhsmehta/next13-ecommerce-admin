import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  testID: string;
  accessibilityLabel: string;
  placeholder?: string;
  allowClear?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: StyleProp<any>;
  disabled?: boolean;
}

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(date.getTime()) ? date : null;
}

export function DateField({
  value,
  onChange,
  testID,
  accessibilityLabel,
  placeholder = "Select date",
  allowClear = true,
  minimumDate,
  maximumDate,
  style,
  disabled,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseYmd(value), [value]);
  const pickerValue = selectedDate ?? minimumDate ?? new Date();

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== "ios") setOpen(false);
    if (event.type === "dismissed" || !selected) return;
    onChange(toYmd(selected));
  }

  return (
    <View>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens a calendar date picker."
        disabled={disabled}
        style={[styles.button, disabled ? styles.disabled : null, style]}
        onPress={() => setOpen(true)}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={value ? Colors.primary : Colors.textTertiary}
        />
        <Text
          style={[styles.text, !value ? styles.placeholder : null]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {allowClear && value ? (
          <Pressable
            testID={`${testID}-clear`}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${accessibilityLabel.toLowerCase()}`}
            hitSlop={8}
            onPress={() => onChange("")}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        ) : null}
      </Pressable>
      {open ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  disabled: { opacity: 0.55 },
  text: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: "600",
  },
  placeholder: {
    color: Colors.textTertiary,
    fontWeight: "500",
  },
});
