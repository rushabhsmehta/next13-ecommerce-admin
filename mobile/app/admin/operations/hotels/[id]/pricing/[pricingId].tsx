import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
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
  createOperationsClient,
  type HotelPricingDetailResponse,
} from "@/lib/operations";
import { HotelPricingForm } from "@/components/operations/HotelPricingForm";

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function HotelPricingDetailScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: hotelId, pricingId, mode } = useLocalSearchParams<{
    id: string;
    pricingId: string;
    mode?: string;
  }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [data, setData] = useState<HotelPricingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!hotelId || !pricingId) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await client.getHotelPricing(hotelId, pricingId));
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load pricing row."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hotelId, pricingId, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function deletePricing() {
    if (!hotelId || !pricingId) return;
    setDeleting(true);
    try {
      await client.deleteHotelPricing(hotelId, pricingId);
      router.replace(`/admin/operations/hotels/${hotelId}/pricing` as never);
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not delete pricing row."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
        <Text style={styles.errText}>{error ?? "Not found"}</Text>
        <Pressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const { hotel, pricing: p } = data;
  const meal =
    p.mealPlanName ?? (p.mealPlanCode ? p.mealPlanCode : "None");

  if (String(mode ?? "") === "edit") {
    return (
      <PermissionGate permission="operations.write">
        <HotelPricingForm
          hotelId={hotelId}
          pricingId={pricingId}
          mode="edit"
          initial={{
            roomTypeId: p.roomTypeId ?? "",
            roomTypeName: p.roomTypeName ?? "",
            occupancyTypeId: p.occupancyTypeId ?? "",
            occupancyTypeName: p.occupancyTypeName ?? "",
            mealPlanId: p.mealPlanId ?? "",
            mealPlanName: meal,
            price: String(p.price),
            startDate: new Date(p.startDate),
            endDate: new Date(p.endDate),
            isActive: p.isActive,
          }}
        />
      </PermissionGate>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen options={{ title: "Pricing detail", headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Pricing detail
        </Text>
      </View>

      <ScrollView
        testID="hotel-pricing-detail"
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
        <Text style={styles.hotelName}>{hotel.name}</Text>
        <View style={styles.priceHero}>
          <Text style={styles.priceLabel}>Nightly rate</Text>
          <Text style={styles.priceValue}>{inr(p.price)}</Text>
          <Text style={styles.dateRange}>
            {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            testID="hotel-pricing-edit"
            accessibilityRole="button"
            accessibilityLabel="Edit hotel pricing"
            style={styles.primaryAction}
            onPress={() =>
              router.push(
                `/admin/operations/hotels/${hotelId}/pricing/${pricingId}?mode=edit` as never
              )
            }
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.primaryActionText}>Edit</Text>
          </Pressable>
          <Pressable
            testID="hotel-pricing-delete"
            accessibilityRole="button"
            accessibilityLabel="Delete hotel pricing"
            disabled={deleting}
            style={[styles.dangerAction, deleting ? styles.disabled : null]}
            onPress={() =>
              Alert.alert("Delete pricing?", "This removes the selected pricing period.", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => void deletePricing() },
              ])
            }
          >
            {deleting ? (
              <ActivityIndicator color={Colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                <Text style={styles.dangerActionText}>Delete</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Row label="Room type" value={p.roomTypeName ?? "—"} />
          {p.roomTypeDescription ? (
            <Row label="Room notes" value={p.roomTypeDescription} />
          ) : null}
          <Row label="Occupancy" value={p.occupancyTypeName ?? "—"} />
          {p.occupancyMaxPersons != null ? (
            <Row label="Max guests" value={String(p.occupancyMaxPersons)} />
          ) : null}
          <Row label="Meal plan" value={meal} />
          <Row label="Status" value={p.isActive ? "Active" : "Inactive"} />
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.noteText}>
            New overlapping ranges are split automatically to preserve non-overlapping dates.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: "700", color: Colors.text },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  errText: { marginTop: Spacing.md, color: Colors.error, textAlign: "center" },
  retry: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  hotelName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  priceHero: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  primaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  primaryActionText: { color: "#fff", fontWeight: "800", fontSize: FontSize.sm },
  dangerAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "#fecdd3",
    backgroundColor: "#fff1f2",
  },
  dangerActionText: { color: Colors.error, fontWeight: "800", fontSize: FontSize.sm },
  disabled: { opacity: 0.6 },
  priceLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  priceValue: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  dateRange: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: Spacing.sm,
    fontWeight: "600",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  rowValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: "500",
    flex: 1.2,
    textAlign: "right",
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
  },
  noteText: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
});
