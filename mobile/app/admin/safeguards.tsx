import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ApiError, withAuth } from "@/lib/api";

type SafetyOverview = {
  safety: Record<string, string>;
};

export default function AdminSafeguardsScreen() {
  const router = useRouter();
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
    <AdminScreen testID="admin-safeguards-screen" contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Safeguards", headerShown: false }} />

      <AdminTopBar
        title="Admin safeguards"
        subtitle="Operational policies"
        onBackPress={() => router.back()}
        testID="admin-safeguards-header"
      />

      {loading ? (
        <AdminLoadingState label="Loading safeguards…" testID="admin-safeguards-loading" />
      ) : error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load()}
          testID="admin-safeguards-error"
        />
      ) : (
        rows.map((r) => (
          <View
            key={r.k}
            style={styles.row}
            accessibilityRole="text"
            accessibilityLabel={`${r.label}. ${r.text!.replace(/_/g, " ")}.`}
          >
            <Text style={styles.label}>{r.label}</Text>
            <Text style={styles.body}>{String(r.text).replace(/_/g, " ")}</Text>
          </View>
        ))
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
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
});
