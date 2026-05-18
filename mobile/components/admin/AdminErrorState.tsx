import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  testID?: string;
}

export function AdminErrorState({
  message,
  onRetry,
  retryLabel = "Try again",
  testID = "admin-error-state",
}: AdminErrorStateProps) {
  const displayMessage = toFriendlyErrorMessage(message);

  return (
    <View
      style={styles.root}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={displayMessage}
    >
      <Ionicons name="warning-outline" size={22} color={Colors.error} accessibilityElementsHidden />
      <Text style={styles.message} allowFontScaling={false}>
        {displayMessage}
      </Text>
      {onRetry ? (
        <Pressable
          testID={`${testID}-retry`}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          onPress={onRetry}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.retryText} allowFontScaling={false}>
            {retryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function toFriendlyErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "Something went wrong.";

  if (/request failed with status 4\d\d/i.test(trimmed)) {
    return "Could not load this record.";
  }

  if (/request failed with status 5\d\d/i.test(trimmed)) {
    return "The server is not responding right now.";
  }

  if (/network request failed|timeout|timed out/i.test(trimmed)) {
    return "Check your connection and try again.";
  }

  return trimmed;
}

const styles = StyleSheet.create({
  root: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#fff1f2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#fecdd3",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.sm,
  },
  message: {
    flex: 1,
    minWidth: 160,
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.error,
    lineHeight: 18,
  },
  retryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  retryText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
  pressed: { opacity: 0.85 },
});
