import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createOperationsClient,
  type OpsActivityMaster,
  type OpsItineraryMaster,
} from "@/lib/operations";

type Kind = "itinerary" | "activity";
type RecordRow = OpsItineraryMaster | OpsActivityMaster;

export function MasterRecordList({ kind }: { kind: Kind }) {
  return (
    <PermissionGate permission="operations.read">
      <Inner kind={kind} />
    </PermissionGate>
  );
}

function labels(kind: Kind) {
  return kind === "itinerary"
    ? {
        title: "Itinerary masters",
        route: "/admin/operations/itineraries",
        icon: "list-outline" as const,
        emptyBody: "Create an itinerary master to reuse day plans across packages.",
      }
    : {
        title: "Activity masters",
        route: "/admin/operations/activities",
        icon: "walk-outline" as const,
        emptyBody: "Create an activity master to reuse experiences across packages.",
      };
}

function Inner({ kind }: { kind: Kind }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const meta = labels(kind);
  const [items, setItems] = useState<RecordRow[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res =
          kind === "itinerary"
            ? await client.listItineraries({ search: debounced, limit: 100 })
            : await client.listActivities({ search: debounced, limit: 100 });
        setItems(res.items);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load records.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, kind, debounced]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const subtitle = loading
    ? "Loading..."
    : `${items.length} record${items.length === 1 ? "" : "s"}`;

  return (
    <AdminScreen scroll={false} testID={`${kind}-masters-screen`}>
      <Stack.Screen options={{ title: meta.title, headerShown: false }} />

      <AdminTopBar
        title={meta.title}
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID={`${kind}-masters-header`}
        rightSlot={
          <AdminTopBarPrimaryButton
            label="New"
            icon="add"
            testID={`${kind}-add`}
            onPress={() => router.push(`${meta.route}/new` as never)}
          />
        }
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Title or location"
        searchTestID={`${kind}-search`}
        testID={`${kind}-command-bar`}
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh")}
          testID={`${kind}-error`}
        />
      ) : null}

      <FlatList
        testID={`${kind}-list`}
        style={styles.list}
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon={meta.icon}
              title="No records"
              body={debounced ? "Try another search term." : meta.emptyBody}
              actionLabel={!debounced ? "Create record" : undefined}
              onActionPress={
                !debounced ? () => router.push(`${meta.route}/new` as never) : undefined
              }
              testID={`${kind}-empty`}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`${kind}-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={item.title ?? "Record"}
            style={styles.row}
            onPress={() => router.push(`${meta.route}/${item.id}` as never)}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={meta.icon} size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title || "Untitled"}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.locationLabel || "No location"}
              </Text>
              <Text style={styles.rowSub} numberOfLines={2}>
                {item.description || "No description"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </Pressable>
        )}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xl },
  listContent: { paddingHorizontal: Spacing.lg },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: FontSize.md, fontWeight: "900", color: Colors.text },
  rowMeta: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "700" },
  rowSub: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
});
