import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminQuickCreateField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "phone-pad" | "url" | "numeric";
  secureTextEntry?: boolean;
  maxLength?: number;
}

export interface AdminQuickCreateModalProps {
  visible: boolean;
  title: string;
  fields: AdminQuickCreateField[];
  submitLabel?: string;
  loading?: boolean;
  hint?: string;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  onClose: () => void;
  testID?: string;
}

export function AdminQuickCreateModal({
  visible,
  title,
  fields,
  submitLabel = "Create",
  loading = false,
  hint,
  onSubmit,
  onClose,
  testID = "admin-quick-create",
}: AdminQuickCreateModalProps) {
  const insets = useSafeAreaInsets();
  const emptyValues = useMemo(() => {
    const next: Record<string, string> = {};
    for (const field of fields) next[field.key] = "";
    return next;
  }, [fields]);

  const [values, setValues] = useState<Record<string, string>>(emptyValues);

  useEffect(() => {
    if (visible) setValues(emptyValues);
  }, [visible, emptyValues]);

  const canSubmit =
    !loading &&
    fields.every((field) => {
      if (!field.required) return true;
      return (values[field.key] ?? "").trim().length > 0;
    });

  async function handleSubmit() {
    if (!canSubmit) return;
    const trimmed: Record<string, string> = {};
    for (const field of fields) {
      trimmed[field.key] = (values[field.key] ?? "").trim();
    }
    await onSubmit(trimmed);
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={loading ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={loading ? undefined : onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View
          style={[
            styles.card,
            { marginBottom: Math.max(insets.bottom, Spacing.lg) },
          ]}
          testID={testID}
        >
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header" allowFontScaling={false}>
              {title}
            </Text>
            <Pressable
              testID={`${testID}-close`}
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={loading}
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={20} color={Colors.text} />
            </Pressable>
          </View>

          {hint ? (
            <Text style={styles.hint} allowFontScaling={false}>
              {hint}
            </Text>
          ) : null}

          <View style={styles.fields}>
            {fields.map((field, index) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.label} allowFontScaling={false}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Text>
                <TextInput
                  testID={`${testID}-field-${field.key}`}
                  accessibilityLabel={field.label}
                  style={styles.input}
                  value={values[field.key] ?? ""}
                  onChangeText={(text) =>
                    setValues((prev) => ({ ...prev, [field.key]: text }))
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize={field.autoCapitalize ?? "sentences"}
                  autoCorrect={false}
                  keyboardType={field.keyboardType ?? "default"}
                  secureTextEntry={field.secureTextEntry}
                  maxLength={field.maxLength}
                  editable={!loading}
                  autoFocus={index === 0}
                  onSubmitEditing={() => {
                    if (index === fields.length - 1) void handleSubmit();
                  }}
                  returnKeyType={index === fields.length - 1 ? "done" : "next"}
                />
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              testID={`${testID}-cancel`}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              disabled={loading}
              onPress={onClose}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText} allowFontScaling={false}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              testID={`${testID}-submit`}
              accessibilityRole="button"
              accessibilityLabel={submitLabel}
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.submitBtn,
                !canSubmit && styles.submitBtnDisabled,
                pressed && canSubmit && styles.submitBtnPressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText} allowFontScaling={false}>
                  {submitLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  card: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text, flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  fields: { gap: Spacing.md },
  field: { gap: Spacing.xs },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  cancelText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  submitBtn: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    minHeight: 48,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnPressed: { opacity: 0.9 },
  submitText: { fontSize: FontSize.md, fontWeight: "800", color: "#fff" },
  pressed: { opacity: 0.85 },
});
