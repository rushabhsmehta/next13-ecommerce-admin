import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarIconButton,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createReportsClient,
  REPORT_LABELS,
  REPORT_KINDS,
  type MobileReportDetail,
  type ReportKind,
} from "@/lib/reports";

function isReportKind(value: string): value is ReportKind {
  return (REPORT_KINDS as readonly string[]).includes(value);
}

function formatValue(value: string | number | null | undefined): string {
  if (value == null) return "-";
  if (typeof value === "number") {
    if (Math.abs(value) >= 1000) return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
    return String(value);
  }
  return value;
}

function reportShareText(data: MobileReportDetail): string {
  const summary = data.summary.map((s) => `${s.label}: ${formatValue(s.value)}`).join("\n");
  const rows = data.rows
    .slice(0, 20)
    .map((r) => `${r.title}${r.amount != null ? ` - ${formatValue(r.amount)}` : ""}`)
    .join("\n");
  return `${data.title}\nGenerated: ${new Date(data.generatedAt).toLocaleString("en-IN")}\n\n${summary}\n\n${rows}`;
}

export default function ReportDetailScreen() {
  return (
    <PermissionGate permission="reports.read">
      <ReportDetailInner />
    </PermissionGate>
  );
}

function ReportDetailInner() {
  const router = useRouter();
  const { kind: rawKind } = useLocalSearchParams<{ kind: string }>();
  const kind: ReportKind = isReportKind(rawKind ?? "")
    ? (rawKind as ReportKind)
    : "profit";
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createReportsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [data, setData] = useState<MobileReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await client.getReport(kind, 90));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load report.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, kind]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function shareReport() {
    if (!data) return;
    await Share.share({ title: data.title, message: reportShareText(data) });
  }

  if (loading) {
    return <AdminLoadingState label="Loading report…" testID="report-detail-loading" />;
  }

  if (error || !data) {
    return (
      <AdminScreen testID="report-detail-error">
        <Stack.Screen options={{ title: REPORT_LABELS[kind], headerShown: false }} />
        <AdminErrorState
          message={error ?? "Report not found"}
          onRetry={() => void load()}
          testID="report-detail-error-state"
        />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen
      testID="report-detail-screen"
      bottomInset={Spacing.xl}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />
      }
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: data.title, headerShown: false }} />
      <AdminTopBar
        title={REPORT_LABELS[kind]}
        subtitle={new Date(data.generatedAt).toLocaleString("en-IN")}
        onBackPress={() => router.back()}
        testID="report-detail-header"
        rightSlot={
          <AdminTopBarIconButton
            icon="share-outline"
            label="Share report"
            testID="report-share"
            onPress={() => void shareReport()}
          />
        }
      />
        <View style={styles.summaryGrid}>
          {data.summary.map((s) => (
            <View key={s.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{s.label}</Text>
              <Text style={styles.summaryValue}>{formatValue(s.value)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rows</Text>
          {data.rows.length ? (
            data.rows.map((row) => (
              <View key={row.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {row.title}
                  </Text>
                  {row.subtitle ? (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {row.subtitle}
                    </Text>
                  ) : null}
                </View>
                {row.status ? <Text style={styles.status}>{row.status}</Text> : null}
                {row.amount != null ? (
                  <Text style={styles.amount}>{formatValue(row.amount)}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No rows for this report.</Text>
          )}
        </View>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  summaryCard: {
    flexGrow: 1,
    minWidth: "45%",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: 4,
  },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "800" },
  summaryValue: { fontSize: FontSize.lg, color: Colors.text, fontWeight: "900" },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
  },
  rowTitle: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  rowSub: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  status: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "900",
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  amount: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text, maxWidth: 120 },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: "center" },
  errorTitle: { fontSize: FontSize.md, color: Colors.text, fontWeight: "800", textAlign: "center" },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "900" },
});
