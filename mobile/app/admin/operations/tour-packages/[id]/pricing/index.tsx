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
import { useAuth } from "@clerk/clerk-expo";
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
import {
  createTourPackagesClient,
  type TourPackagePricingRow,
} from "@/lib/tour-packages";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function TourPackagePricingListScreen() {
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

  const [items, setItems] = useState<TourPackagePricingRow[]>([]);
  const [title, setTitle] = useState("Seasonal pricing");
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
        const res = await client.listPricing(packageId);
        setItems(res.items);
        setTitle(res.package.tourPackageName ?? "Seasonal pricing");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load pricing.");
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
      <AdminLoadingState label="Loading pricing…" testID="tour-package-pricing-loading" />
    );
  }

  if (error) {
    return (
      <AdminScreen testID="tour-package-pricing-error">
        <AdminErrorState message={error} onRetry={() => void load()} />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen scroll={false} testID="tour-package-pricing-screen">
      <Stack.Screen options={{ title, headerShown: false }} />
      <AdminTopBar
        title={title}
        subtitle="Seasonal pricing"
        onBackPress={() => router.back()}
        testID="tour-package-pricing-header"
        rightSlot={
          <AdminTopBarPrimaryButton
            label="Add"
            icon="add"
            testID="tour-package-pricing-add"
            onPress={() =>
              router.push(
                `/admin/operations/tour-packages/${packageId}/pricing/new` as never
              )
            }
          />
        }
      />
      <FlatList
        data={items}
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
            <Ionicons name="pricetag-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No pricing rows</Text>
            <Text style={styles.emptySub}>Add seasonal rates with meal plan and components.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`tour-package-pricing-row-${item.id}`}
            style={styles.card}
            onPress={() =>
              router.push(
                `/admin/operations/tour-packages/${packageId}/pricing/${item.id}` as never
              )
            }
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardDates}>
                {fmtDate(item.startDate)} – {fmtDate(item.endDate)}
              </Text>
              <Text style={styles.cardPrice}>{inr(item.totalPrice)}</Text>
            </View>
            <Text style={styles.cardSub} numberOfLines={2}>
              {[item.mealPlanName, item.packageVariantName, item.seasonalPeriodName]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
            {!item.isActive ? <Text style={styles.inactive}>Inactive</Text> : null}
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
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  cardDates: { flex: 1, fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  cardPrice: { fontSize: FontSize.md, fontWeight: "700", color: Colors.primary },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  inactive: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: "600",
  },
  chevron: { position: "absolute", right: Spacing.md, top: "50%" },
});
