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
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminEntityRow,
  AdminErrorState,
  AdminScreen,
  AdminStatusPill,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  createOperationsClient,
  type OperationalStaffMember,
} from "@/lib/operations";

export default function StaffListScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("operations.write");
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [items, setItems] = useState<OperationalStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh", term: string) => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await client.listStaff({
          search: term || undefined,
          activeOnly,
        });
        setItems(res.staff);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load staff."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, activeOnly]
  );

  useEffect(() => {
    void load("initial", debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, activeOnly]);

  const subtitle = loading ? "Loading..." : `${items.length} shown`;

  return (
    <AdminScreen scroll={false} testID="staff-screen">
      <Stack.Screen options={{ title: "Operational staff", headerShown: false }} />

      <AdminTopBar
        title="Operational staff"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID="staff-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarPrimaryButton
              label="New"
              icon="add"
              testID="staff-new"
              onPress={() => router.push("/admin/operations/staff/new" as never)}
            />
          ) : null
        }
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email"
        searchTestID="staff-search"
        testID="staff-command-bar"
      />

      <View style={styles.filterRow}>
        <Pressable
          testID="staff-filter-active"
          onPress={() => setActiveOnly((v) => !v)}
          style={[styles.filterChip, activeOnly ? styles.filterChipActive : null]}
        >
          <Text
            style={[
              styles.filterChipText,
              activeOnly ? styles.filterChipTextActive : null,
            ]}
          >
            Active only
          </Text>
        </Pressable>
      </View>

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debounced)}
          testID="staff-error"
        />
      ) : null}

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(s) => s.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh", debounced)}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="people-outline"
              title="No staff"
              body={debounced ? "Try a different search." : "Tap + to add one."}
              testID="staff-empty"
            />
          )
        }
        renderItem={({ item }) => (
          <AdminEntityRow
            testID={`staff-row-${item.id}`}
            title={item.name}
            subtitle={item.email}
            meta={item.role === "ADMIN" ? "Admin" : "Operations"}
            icon="person-circle-outline"
            onPress={() =>
              router.push(`/admin/operations/staff/${item.id}` as never)
            }
            trailing={
              !item.isActive ? (
                <AdminStatusPill label="Inactive" variant="muted" compact />
              ) : undefined
            }
          />
        )}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xl },
  listContent: { paddingHorizontal: Spacing.lg },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  filterChipText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primary },
});
