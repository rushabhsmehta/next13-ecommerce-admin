import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
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
import { PermissionGate, OfflineGate } from "@/components/auth/PermissionGate";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
  AdminTopBarIconButton,
} from "@/components/admin";
import { API_BASE_URL, getTravelPackageUrl } from "@/constants/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  createWebsiteManagementClient,
  type WebsiteLocationOption,
  type WebsitePackage,
} from "@/lib/website-management";

const PAGE_SIZE = 80;

type StatusFilter = "all" | "published" | "draft" | "archived";

const STATUSES: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Live" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
];

export default function WebsiteManagementScreen() {
  return (
    <PermissionGate permission="website.read">
      <OfflineGate policy="online_only">
        <WebsiteManagementInner />
      </OfflineGate>
    </PermissionGate>
  );
}

function WebsiteManagementInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("website.write");
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createWebsiteManagementClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [items, setItems] = useState<WebsitePackage[]>([]);
  const [locations, setLocations] = useState<WebsiteLocationOption[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [locationId, setLocationId] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [relatedOpenId, setRelatedOpenId] = useState<string | null>(null);
  const [relatedDraft, setRelatedDraft] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await client.listPackages({
          search: debounced || undefined,
          locationId: locationId === "all" ? undefined : locationId,
          status,
          limit: PAGE_SIZE,
          offset: 0,
        });
        setItems(res.items);
        setLocations(res.locations);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load website packages.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, debounced, locationId, status]
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const packagesByLocation = useMemo(() => {
    const map = new Map<string, WebsitePackage[]>();
    for (const item of items) {
      const rows = map.get(item.locationId) ?? [];
      rows.push(item);
      map.set(item.locationId, rows);
    }
    for (const rows of map.values()) {
      rows.sort((a, b) => a.websiteSortOrder - b.websiteSortOrder || a.name.localeCompare(b.name));
    }
    return map;
  }, [items]);

  function replaceItem(next: WebsitePackage) {
    setItems((prev) => prev.map((item) => (item.id === next.id ? { ...item, ...next } : item)));
  }

  async function updatePackage(item: WebsitePackage, patch: Partial<WebsitePackage>) {
    if (!canWrite) return;
    setBusyId(item.id);
    try {
      const next = await client.updatePackage(item.id, patch);
      replaceItem({ ...item, ...next });
    } catch (err) {
      Alert.alert(
        "Update failed",
        err instanceof ApiError ? err.message : "Could not update this package."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function movePackage(item: WebsitePackage, direction: -1 | 1) {
    if (!canWrite || item.isArchived) return;
    const siblings = (packagesByLocation.get(item.locationId) ?? []).filter((pkg) => !pkg.isArchived);
    const index = siblings.findIndex((pkg) => pkg.id === item.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return;
    const ordered = [...siblings];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, moved);
    setBusyId(item.id);
    try {
      await client.reorderPackages(item.locationId, ordered.map((pkg) => pkg.id));
      setItems((prev) =>
        prev.map((pkg) => {
          const reorderedIndex = ordered.findIndex((row) => row.id === pkg.id);
          return reorderedIndex >= 0 ? { ...pkg, websiteSortOrder: reorderedIndex } : pkg;
        })
      );
    } catch (err) {
      Alert.alert(
        "Reorder failed",
        err instanceof ApiError ? err.message : "Could not update website order."
      );
    } finally {
      setBusyId(null);
    }
  }

  function openRelated(item: WebsitePackage) {
    const current = item.relatedPackages.map((pkg) => pkg.id);
    setRelatedDraft((prev) => ({ ...prev, [item.id]: prev[item.id] ?? current }));
    setRelatedOpenId((currentOpen) => (currentOpen === item.id ? null : item.id));
  }

  function toggleRelated(item: WebsitePackage, relatedId: string) {
    setRelatedDraft((prev) => {
      const current = prev[item.id] ?? item.relatedPackages.map((pkg) => pkg.id);
      const next = current.includes(relatedId)
        ? current.filter((id) => id !== relatedId)
        : [...current, relatedId].slice(0, 6);
      return { ...prev, [item.id]: next };
    });
  }

  async function saveRelated(item: WebsitePackage) {
    const ids = relatedDraft[item.id] ?? item.relatedPackages.map((pkg) => pkg.id);
    setBusyId(item.id);
    try {
      await client.updateRelated(item.id, ids);
      setItems((prev) =>
        prev.map((pkg) =>
          pkg.id === item.id
            ? {
                ...pkg,
                relatedPackages: ids
                  .map((id, sortOrder) => {
                    const target = prev.find((candidate) => candidate.id === id);
                    return target
                      ? {
                          id: target.id,
                          name: target.name,
                          locationId: target.locationId,
                          isArchived: target.isArchived,
                          websiteSortOrder: target.websiteSortOrder,
                          sortOrder,
                        }
                      : null;
                  })
                  .filter((row): row is NonNullable<typeof row> => !!row),
              }
            : pkg
        )
      );
      setRelatedOpenId(null);
    } catch (err) {
      Alert.alert(
        "Related packages failed",
        err instanceof ApiError ? err.message : "Could not save related packages."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function preview(item: WebsitePackage) {
    const url = getTravelPackageUrl(item.slug, item.id);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Preview unavailable", url);
    }
  }

  async function sharePackage(item: WebsitePackage, brochure = false) {
    const publicUrl = getTravelPackageUrl(item.slug, item.id);
    const slug = item.slug || item.id;
    const brochureUrl = `${API_BASE_URL.replace(/\/$/, "")}/api/travel/package-brochure/${encodeURIComponent(slug)}`;
    const url = brochure ? brochureUrl : publicUrl;
    await Share.share({
      title: item.name,
      message: `${item.name}\n${url}`,
      url,
    });
  }

  const subtitle = loading ? "Loading..." : `${items.length} package${items.length === 1 ? "" : "s"}`;

  return (
    <AdminScreen scroll={false} testID="website-management-screen">
      <Stack.Screen options={{ title: "Website", headerShown: false }} />
      <AdminTopBar
        title="Website"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID="website-header"
        rightSlot={
          <AdminTopBarIconButton
            icon="refresh"
            label="Refresh website packages"
            testID="website-refresh"
            onPress={() => void load("refresh")}
          />
        }
      />

      <AdminSegmentedControl
        options={STATUSES}
        value={status}
        onChange={setStatus}
        testIDPrefix="website-status"
        scrollable={false}
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Package, type, category, location"
        searchTestID="website-search"
        testID="website-command-bar"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.locationRail}
        testID="website-location-filter"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show all locations"
          accessibilityState={{ selected: locationId === "all" }}
          style={[styles.locationChip, locationId === "all" ? styles.locationChipActive : null]}
          onPress={() => setLocationId("all")}
        >
          <Text style={[styles.locationText, locationId === "all" ? styles.locationTextActive : null]}>
            All
          </Text>
        </Pressable>
        {locations.map((location) => (
          <Pressable
            key={location.id}
            testID={`website-location-${location.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Show ${location.label} packages`}
            accessibilityState={{ selected: locationId === location.id }}
            style={[styles.locationChip, locationId === location.id ? styles.locationChipActive : null]}
            onPress={() => setLocationId(location.id)}
          >
            <Text style={[styles.locationText, locationId === location.id ? styles.locationTextActive : null]}>
              {location.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh")}
          testID="website-error"
        />
      ) : null}

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="globe-outline"
              title="No packages"
              body="Try another location, status, or search term."
              testID="website-empty"
            />
          )
        }
        renderItem={({ item }) => {
          const isBusy = busyId === item.id;
          const isLive = item.isFeatured && !item.isArchived;
          const candidates = items
            .filter((candidate) => candidate.id !== item.id && !candidate.isArchived)
            .slice(0, 20);
          const draftIds = relatedDraft[item.id] ?? item.relatedPackages.map((pkg) => pkg.id);
          return (
            <View style={styles.row} testID={`website-package-${item.id}`}>
              <View style={styles.rowTop}>
                <View style={styles.rowIcon}>
                  <Ionicons name="globe-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.locationLabel} - Order {item.websiteSortOrder + 1}
                  </Text>
                </View>
                <View style={[styles.statusPill, item.isArchived ? styles.statusBad : isLive ? styles.statusOk : styles.statusWarn]}>
                  <Text style={styles.statusText}>{item.isArchived ? "Archived" : isLive ? "Live" : "Draft"}</Text>
                </View>
              </View>

              <View style={styles.actionGrid}>
                <ActionButton
                  testID={`website-toggle-live-${item.id}`}
                  label={item.isFeatured ? "Unpublish" : "Publish"}
                  icon={item.isFeatured ? "eye-off-outline" : "eye-outline"}
                  disabled={!canWrite || isBusy || item.isArchived}
                  onPress={() => void updatePackage(item, { isFeatured: !item.isFeatured })}
                />
                <ActionButton
                  testID={`website-toggle-archive-${item.id}`}
                  label={item.isArchived ? "Restore" : "Archive"}
                  icon={item.isArchived ? "refresh-outline" : "archive-outline"}
                  disabled={!canWrite || isBusy}
                  onPress={() => void updatePackage(item, { isArchived: !item.isArchived })}
                />
                <ActionButton
                  testID={`website-move-up-${item.id}`}
                  label="Up"
                  icon="arrow-up-outline"
                  disabled={!canWrite || isBusy || item.isArchived}
                  onPress={() => void movePackage(item, -1)}
                />
                <ActionButton
                  testID={`website-move-down-${item.id}`}
                  label="Down"
                  icon="arrow-down-outline"
                  disabled={!canWrite || isBusy || item.isArchived}
                  onPress={() => void movePackage(item, 1)}
                />
                <ActionButton
                  testID={`website-preview-${item.id}`}
                  label="Preview"
                  icon="open-outline"
                  disabled={item.isArchived}
                  onPress={() => void preview(item)}
                />
                <ActionButton
                  testID={`website-share-${item.id}`}
                  label="Share"
                  icon="share-outline"
                  disabled={item.isArchived}
                  onPress={() => void sharePackage(item)}
                />
                <ActionButton
                  testID={`website-brochure-${item.id}`}
                  label="Brochure"
                  icon="document-text-outline"
                  disabled={item.isArchived}
                  onPress={() => void sharePackage(item, true)}
                />
                <ActionButton
                  testID={`website-related-${item.id}`}
                  label="Related"
                  icon="git-network-outline"
                  disabled={!canWrite || isBusy}
                  onPress={() => openRelated(item)}
                />
              </View>

              {relatedOpenId === item.id ? (
                <View style={styles.relatedBox}>
                  <Text style={styles.relatedTitle}>Related recommendations</Text>
                  <View style={styles.relatedChips}>
                    {candidates.map((candidate) => {
                      const selected = draftIds.includes(candidate.id);
                      return (
                        <Pressable
                          key={candidate.id}
                          testID={`website-related-pick-${candidate.id}`}
                          accessibilityRole="button"
                          accessibilityLabel={`${selected ? "Remove" : "Add"} ${candidate.name} as related`}
                          accessibilityState={{ selected }}
                          style={[styles.relatedChip, selected ? styles.relatedChipActive : null]}
                          onPress={() => toggleRelated(item, candidate.id)}
                        >
                          <Text
                            style={[styles.relatedChipText, selected ? styles.relatedChipTextActive : null]}
                            numberOfLines={1}
                          >
                            {candidate.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable
                    testID={`website-related-save-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Save related packages"
                    disabled={isBusy}
                    style={[styles.saveRelatedButton, isBusy ? styles.disabled : null]}
                    onPress={() => void saveRelated(item)}
                  >
                    {isBusy ? <ActivityIndicator size="small" color="#fff" /> : null}
                    <Text style={styles.saveRelatedText}>Save related</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </AdminScreen>
  );
}

function ActionButton({
  label,
  icon,
  disabled,
  onPress,
  testID,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={[styles.actionButton, disabled ? styles.disabled : null]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={disabled ? Colors.textTertiary : Colors.primary} />
      <Text style={[styles.actionText, disabled ? styles.actionTextDisabled : null]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xl },
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },
  segmentRail: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.xs,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.lg,
  },
  segment: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: BorderRadius.md },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textInverse },
  locationRail: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  locationChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  locationChipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primaryLight },
  locationText: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.textSecondary },
  locationTextActive: { color: Colors.primary },
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
  listContent: { paddingHorizontal: Spacing.lg },
  centered: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: FontSize.md, fontWeight: "900", color: Colors.text },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusOk: { backgroundColor: "#dcfce7" },
  statusWarn: { backgroundColor: "#fef3c7" },
  statusBad: { backgroundColor: "#fee2e2" },
  statusText: { fontSize: 10, fontWeight: "900", color: Colors.text },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  actionButton: {
    width: "23.5%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 2,
  },
  actionText: { fontSize: 10, fontWeight: "800", color: Colors.primary },
  actionTextDisabled: { color: Colors.textTertiary },
  disabled: { opacity: 0.45 },
  relatedBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  relatedTitle: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  relatedChips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  relatedChip: {
    maxWidth: "100%",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  relatedChipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primaryLight },
  relatedChipText: { maxWidth: 180, fontSize: FontSize.xs, fontWeight: "800", color: Colors.textSecondary },
  relatedChipTextActive: { color: Colors.primary },
  saveRelatedButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  saveRelatedText: { color: Colors.textInverse, fontSize: FontSize.sm, fontWeight: "900" },
});

