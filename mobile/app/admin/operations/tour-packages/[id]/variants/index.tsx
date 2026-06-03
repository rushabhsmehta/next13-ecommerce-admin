import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
import { createTourPackagesClient, type PackageVariant } from "@/lib/tour-packages";

export default function TourPackageVariantsScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: packageId } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createTourPackagesClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [variants, setVariants] = useState<PackageVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!packageId) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await client.listVariants(packageId);
        setVariants(res.variants);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load variants.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [packageId, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <AdminLoadingState label="Loading variants…" testID="tour-package-variants-loading" />
    );
  }

  if (error) {
    return (
      <AdminScreen testID="tour-package-variants-error">
        <AdminErrorState message={error} onRetry={() => void load()} />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen scroll={false} testID="tour-package-variants-screen">
      <Stack.Screen options={{ title: "Variants", headerShown: false }} />
      <AdminTopBar
        title="Package variants"
        subtitle={`${variants.length} variant(s)`}
        onBackPress={() => router.back()}
        testID="tour-package-variants-header"
        rightSlot={
          <AdminTopBarPrimaryButton
            label="Add"
            icon="add"
            testID="tour-package-variant-add"
            onPress={() =>
              router.push(
                `/admin/operations/tour-packages/${packageId}/variants/new` as never
              )
            }
          />
        }
      />
      <FlatList
        data={variants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="layers-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No variants yet</Text>
            <Text style={styles.emptySub}>Add Deluxe, Budget, or other hotel combinations.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`tour-package-variant-row-${item.id}`}
            style={styles.card}
            onPress={() =>
              router.push(
                `/admin/operations/tour-packages/${packageId}/variants/${item.id}` as never
              )
            }
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.isDefault ? <Text style={styles.badge}>Default</Text> : null}
            </View>
            <Text style={styles.cardSub}>
              {item.hotelMappings.length} hotel mapping(s) · {item.pricingCount} pricing row(s)
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} style={styles.chevron} />
          </Pressable>
        )}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, flex: 1 },
  badge: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
  },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  chevron: { position: "absolute", right: Spacing.md, top: "50%" },
});
