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
import {
  createTourPackagesClient,
  type TourPackagePricingRow,
} from "@/lib/tour-packages";

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

type ActiveFilter = "all" | "active" | "inactive";
type ScopeFilter = "all" | "global" | "variant";

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
  const params = useLocalSearchParams<{
    id?: string | string[];
    packageVariantId?: string | string[];
    variantName?: string | string[];
  }>();
  const packageId = firstParam(params.id);
  const packageVariantId = firstParam(params.packageVariantId);
  const variantName = firstParam(params.variantName);
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
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!packageId) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await client.listPricing(packageId, {
          packageVariantId,
          includeGlobal: true,
          activeOnly: false,
        });
        setItems(res.items);
        setTitle(res.package.tourPackageName ?? "Seasonal pricing");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load pricing.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [packageId, packageVariantId, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (activeFilter === "active" && !item.isActive) return false;
        if (activeFilter === "inactive" && item.isActive) return false;
        if (scopeFilter === "global" && item.packageVariantId) return false;
        if (scopeFilter === "variant" && !item.packageVariantId) return false;
        return true;
      }),
    [activeFilter, items, scopeFilter]
  );

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
        subtitle={
          packageVariantId
            ? variantName
              ? `Variant pricing: ${variantName}`
              : "Variant pricing"
            : "Seasonal pricing"
        }
        onBackPress={() => router.back()}
        testID="tour-package-pricing-header"
        rightSlot={
          <AdminTopBarPrimaryButton
            label="Add"
            icon="add"
            testID="tour-package-pricing-add"
            onPress={() =>
              router.push(
                buildPricingRoute(
                  `/admin/operations/tour-packages/${packageId}/pricing/new`,
                  packageVariantId,
                  variantName
                ) as never
              )
            }
          />
        }
      />
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />
        }
        ListHeaderComponent={
          <View style={styles.filters}>
            <View style={styles.filterGroup}>
              {(["all", "active", "inactive"] as ActiveFilter[]).map((filter) => (
                <FilterPill
                  key={filter}
                  label={filter === "all" ? "All" : filter === "active" ? "Active" : "Inactive"}
                  active={activeFilter === filter}
                  onPress={() => setActiveFilter(filter)}
                />
              ))}
            </View>
            <View style={styles.filterGroup}>
              {(["all", "global", "variant"] as ScopeFilter[]).map((filter) => (
                <FilterPill
                  key={filter}
                  label={
                    filter === "all" ? "All scopes" : filter === "global" ? "Global" : "Variant"
                  }
                  active={scopeFilter === filter}
                  onPress={() => setScopeFilter(filter)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No pricing rows</Text>
            <Text style={styles.emptySub}>
              {items.length
                ? "No rows match the current filters."
                : "Add seasonal rates with meal plan and components."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`tour-package-pricing-row-${item.id}`}
            style={styles.card}
            onPress={() =>
              router.push(
                buildPricingRoute(
                  `/admin/operations/tour-packages/${packageId}/pricing/${item.id}`,
                  packageVariantId,
                  variantName
                ) as never
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
              {[
                item.mealPlanName,
                item.packageVariantName ?? "Global",
                item.seasonalPeriodName,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
            {!item.isActive ? <Text style={styles.inactive}>Inactive</Text> : null}
            {item.pricingComponents.length ? (
              <View style={styles.componentsPreview}>
                {item.pricingComponents.slice(0, 3).map((component) => (
                  <View key={component.id} style={styles.componentLine}>
                    <Text style={styles.componentName} numberOfLines={1}>
                      {component.pricingAttributeName}
                    </Text>
                    <Text style={styles.componentPrice}>{inr(component.price)}</Text>
                  </View>
                ))}
                {item.pricingComponents.length > 3 ? (
                  <Text style={styles.moreComponents}>
                    +{item.pricingComponents.length - 3} more components
                  </Text>
                ) : null}
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} style={styles.chevron} />
          </Pressable>
        )}
      />
    </AdminScreen>
  );
}

function buildPricingRoute(
  path: string,
  packageVariantId?: string,
  variantName?: string
): string {
  if (!packageVariantId) return path;
  const query = new URLSearchParams({ packageVariantId });
  if (variantName?.trim()) query.set("variantName", variantName.trim());
  return `${path}?${query.toString()}`;
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.filterPill, active ? styles.filterPillActive : null]}
      onPress={onPress}
    >
      <Text style={[styles.filterPillText, active ? styles.filterPillTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  filters: { gap: Spacing.sm, marginBottom: Spacing.md },
  filterGroup: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  filterPill: {
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  filterPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  filterPillText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  filterPillTextActive: { color: Colors.primary },
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
  componentsPreview: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    gap: 4,
    paddingRight: Spacing.xl,
  },
  componentLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  componentName: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  componentPrice: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.text,
  },
  moreComponents: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textTertiary,
  },
  inactive: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: "600",
  },
  chevron: { position: "absolute", right: Spacing.md, top: "50%" },
});
