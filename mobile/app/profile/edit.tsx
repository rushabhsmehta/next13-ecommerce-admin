import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export default function EditProfileScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/api/mobile/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setName(data.name ?? "");
          setPhone(data.phone ?? "");
          setEmail(data.email ?? "");
        }
      } catch {}
      setLoading(false);
    }
    loadProfile();
  }, [getToken]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Validation", "Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/mobile/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      if (res.ok) {
        Alert.alert("Saved", "Your profile has been updated.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", "Failed to update profile. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <FieldLabel>Full Name</FieldLabel>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <FieldLabel>Phone Number</FieldLabel>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 9876543210"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="phone-pad"
            returnKeyType="done"
          />

          <FieldLabel>Email</FieldLabel>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
            placeholderTextColor={Colors.textTertiary}
          />
          <Text style={styles.emailHint}>Email cannot be changed here.</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: Spacing.xl, gap: 4 },
  form: { gap: 4, marginBottom: Spacing.xxl },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputDisabled: {
    backgroundColor: Colors.surface,
    color: Colors.textTertiary,
  },
  emailHint: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4 },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: FontSize.lg, fontWeight: "700" },
});
