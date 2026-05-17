import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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
import { PermissionGate } from "@/components/auth/PermissionGate";
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
    ? { title: "Itinerary masters", route: "/admin/operations/itineraries", icon: "list-outline" as const }
    : { title: "Activity masters", route: "/admin/operations/activities", icon: "walk-outline" as const };
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res =
          kind === "itinerary"
            ? await client.listItineraries({ search: search.trim(), limit: 100 })
            : await client.listActivities({ search: search.trim(), limit: 100 });
        setItems(res.items);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load records.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, kind, search]
  );

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: meta.title, headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{meta.title}</Text>
          <Text style={styles.headerSub}>{items.length} records</Text>
        </View>
        <Pressable
          testID={`${kind}-add`}
          accessibilityRole="button"
          accessibilityLabel={`Add ${kind}`}
          style={styles.addBtn}
          onPress={() => router.push(`${meta.route}/new` as never)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID={`${kind}-search`}
          accessibilityLabel={`Search ${meta.title}`}
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search title or location"
          placeholderTextColor={Colors.textTertiary}
        />
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        testID={`${kind}-list`}
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons name={meta.icon} size={36} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No records found.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`${kind}-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={item.title ?? "Record"}
            style={styles.card}
            onPress={() => router.push(`${meta.route}/${item.id}` as never)}
          >
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title || "Untitled"}
            </Text>
            <Text style={styles.cardSub} numberOfLines={2}>
              {item.locationLabel || "No location"}
            </Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description || "No description"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm },
  centered: { alignItems: "center", paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontWeight: "700" },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  cardSub: { marginTop: 3, fontSize: FontSize.xs, color: Colors.primary, fontWeight: "700" },
  cardDesc: { marginTop: 6, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 19 },
});
