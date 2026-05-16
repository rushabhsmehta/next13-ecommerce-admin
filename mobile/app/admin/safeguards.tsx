import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminHeader } from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ApiError, withAuth } from "@/lib/api";

type SafetyOverview = {
  safety: Record<string, string>;
};

export default function AdminSafeguardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { canUseAdmin } = useCurrentUser();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const [overview, setOverview] = useState<SafetyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canUseAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await request<SafetyOverview>("/api/mobile/admin/overview", { retries: 1 });
      setOverview(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load safeguards.");
    } finally {
      setLoading(false);
    }
  }, [canUseAdmin, request]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const s = overview?.safety ?? {};
    return [
      { k: "offlineMutations", label: "Offline changes", text: s.offlineMutations },
      { k: "financeWrites", label: "Finance writes", text: s.financeWrites },
      { k: "balanceSource", label: "Balances & truth", text: s.balanceSource },
      { k: "exports", label: "Exports", text: s.exports },
      { k: "nonIdempotentRetries", label: "Retries", text: s.nonIdempotentRetries },
      { k: "serverIdempotency", label: "Idempotency", text: s.serverIdempotency },
      { k: "postWriteRefresh", label: "Refresh after writes", text: s.postWriteRefresh },
      { k: "audit", label: "Sensitive actions", text: s.audit },
    ].filter((r) => !!r.text);
  }, [overview]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Safeguards", headerShown: false }} />
      <AdminHeader
        title="Admin safeguards"
        subtitle="Operational policies"
        onBackPress={() => router.back()}
        showAccent={false}
        testID="admin-safeguards-header"
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} accessibilityLabel="Loading safeguards" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={36} color={Colors.error} accessibilityLabel="Warning" />
          <Text style={styles.errText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((r) => (
            <View
              key={r.k}
              style={styles.row}
              accessibilityRole="text"
              accessibilityLabel={`${r.label}. ${r.text!.replace(/_/g, " ")}.`}
            >
              <Text style={styles.label}>{r.label}</Text>
              <Text style={styles.body}>{String(r.text).replace(/_/g, " ")}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.sm },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  label: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
    lineHeight: 20,
    textTransform: "none",
  },
  errText: { fontSize: FontSize.sm, color: Colors.error, textAlign: "center" },
});
