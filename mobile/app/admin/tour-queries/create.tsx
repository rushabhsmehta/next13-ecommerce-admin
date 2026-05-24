import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminEmptyState, AdminScreen, AdminTopBar } from "@/components/admin";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  createTourQueryCreateClient,
  type TourQueryCreateMode,
} from "@/lib/tour-query-create";
import { type AssociateInquiry } from "@/lib/associate-inquiries";

type SourceRow = { id: string; title: string; subtitle: string };

const MODE_META: Record<
  TourQueryCreateMode,
  { label: string; helper: string; emptyTitle: string; emptyHint: string }
> = {
  inquiry: {
    label: "Inquiry",
    helper: "Best for converting a lead into a quote.",
    emptyTitle: "No matching inquiries",
    emptyHint: "Try customer name or mobile number.",
  },
  package: {
    label: "Package",
    helper: "Best for starting from a standard itinerary.",
    emptyTitle: "No matching packages",
    emptyHint: "Try destination or package name.",
  },
  copy: {
    label: "Copy",
    helper: "Best for repeating a similar past trip.",
    emptyTitle: "No matching trips",
    emptyHint: "Try traveler or query number.",
  },
};

export default function CreateTourQueryScreen() {
  return (
    <PermissionGate permission="salesTrips.write">
      <CreateTourQueryScreenInner />
    </PermissionGate>
  );
}

function CreateTourQueryScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("salesTrips.write");
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const createClient = useMemo(
    () => createTourQueryCreateClient(authRequest),
    [authRequest]
  );
  const [mode, setMode] = useState<TourQueryCreateMode>("inquiry");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadSources = useCallback(
    async (m: TourQueryCreateMode, q: string) => {
      setLoading(true);
      setError(null);
      try {
        if (m === "inquiry") {
          const list = await authRequest<AssociateInquiry[]>(
            `/api/mobile/inquiries?limit=50${q ? `&search=${encodeURIComponent(q)}` : ""}`
          );
          setRows(
            list.map((i) => ({
              id: i.id,
              title: i.customerName || "Inquiry",
              subtitle: `${i.location?.label ?? "—"} · ${i.status ?? "open"}`,
            }))
          );
        } else if (m === "package") {
          const res = await authRequest<{
            packages: {
              id: string;
              tourPackageName: string | null;
              numDaysNight: string | null;
              location: { label: string } | null;
            }[];
          }>(
            `/api/mobile/tour-packages${q ? `?search=${encodeURIComponent(q)}` : ""}`
          );
          setRows(
            res.packages.map((p) => ({
              id: p.id,
              title: p.tourPackageName || "Package",
              subtitle: `${p.location?.label ?? "—"}${p.numDaysNight ? ` · ${p.numDaysNight}` : ""}`,
            }))
          );
        } else {
          const res = await authRequest<{
            queries: {
              id: string;
              tourPackageQueryName: string | null;
              tourPackageQueryNumber: string | null;
              customerName: string | null;
            }[];
          }>(
            `/api/mobile/tour-queries?status=all&limit=50${q ? `&search=${encodeURIComponent(q)}` : ""}`
          );
          setRows(
            res.queries.map((qr) => ({
              id: qr.id,
              title: qr.tourPackageQueryName || qr.tourPackageQueryNumber || "Trip",
              subtitle: qr.customerName || qr.tourPackageQueryNumber || "—",
            }))
          );
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load sources.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [authRequest]
  );

  useEffect(() => {
    void loadSources(mode, debounced);
  }, [mode, debounced, loadSources]);

  const meta = MODE_META[mode];

  const confirmCreate = useCallback(
    (row: SourceRow) => {
      if (!canWrite) return;
      const kind = mode === "inquiry" ? "inquiry" : mode === "package" ? "package" : "trip";
      Alert.alert("Create trip", `Create a new trip from this ${kind}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create trip",
          onPress: async () => {
            setSubmittingId(row.id);
            try {
              const result = await createClient.create({
                mode,
                sourceId: row.id,
              });
              router.replace(`/admin/tour-queries/${result.id}/edit` as never);
            } catch (err) {
              Alert.alert(
                "Create failed",
                err instanceof ApiError ? err.message : "Could not create the trip."
              );
            } finally {
              setSubmittingId(null);
            }
          },
        },
      ]);
    },
    [canWrite, createClient, mode, router]
  );

  return (
    <AdminScreen scroll={false} testID="trip-create-screen">
      <Stack.Screen options={{ title: "New trip", headerShown: false }} />
      <AdminTopBar title="New trip" subtitle="Choose a source" onBackPress={() => router.back()} testID="trip-create-header" />

      <Text style={styles.stepEyebrow}>Step 1 of 1 · Choose a source</Text>

      <View style={styles.modeRow}>
        {(Object.keys(MODE_META) as TourQueryCreateMode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              testID={`trip-create-mode-${m}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${MODE_META[m].label}. ${MODE_META[m].helper}`}
              accessibilityHint={`Select ${MODE_META[m].label} as the trip source.`}
              style={[styles.modeChip, active ? styles.modeChipActive : null]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeChipLabel, active ? styles.modeChipLabelActive : null]}>
                {MODE_META[m].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.helperCard}>
        <Text style={styles.helper}>{meta.helper}</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID="tq-create-search"
          accessibilityLabel={
            mode === "inquiry"
              ? "Search inquiries"
              : mode === "package"
                ? "Search packages"
                : "Search trips to copy"
          }
          style={styles.searchInput}
          placeholder={
            mode === "inquiry"
              ? "Search inquiries..."
              : mode === "package"
                ? "Search packages..."
                : "Search trips to copy..."
          }
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          !debounced && !loading ? (
            <Text style={styles.recentLead}>
              {mode === "inquiry" ? "Recent inquiries" : mode === "package" ? "Packages" : "Recent trips"}
            </Text>
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 24,
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="search-outline"
              title={meta.emptyTitle}
              body={meta.emptyHint}
              testID="tq-create-empty"
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`tq-create-source-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Create trip from ${item.title}`}
            accessibilityHint="Asks for confirmation, then creates the trip."
            style={styles.row}
            disabled={submittingId !== null}
            onPress={() => confirmCreate(item)}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.rowSub} numberOfLines={2}>
                {item.subtitle}
              </Text>
            </View>
            {submittingId === item.id ?
              (
                <View style={styles.createHint}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.creatingText}>Creating...</Text>
                </View>
              )
              : (
                <View style={styles.createHint}>
                  <Text style={styles.createCta}>Create</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                </View>
              )}
          </Pressable>
        )}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  listLoader: { marginTop: Spacing.xl },
  container: { flex: 1, backgroundColor: Colors.background },
  stepEyebrow: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  modeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  modeChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  modeChipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  modeChipLabel: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  modeChipLabelActive: { color: Colors.primary },
  helperCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  helper: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600", lineHeight: 20 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  centered: {
    paddingTop: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  loadingText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  recentLead: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },

  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  rowSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  createHint: { flexDirection: "row", alignItems: "center", gap: 6 },
  createCta: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.primary },
  creatingText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textTertiary },
});
