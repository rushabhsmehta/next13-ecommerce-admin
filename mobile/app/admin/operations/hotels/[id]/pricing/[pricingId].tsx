import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarIconButton,
} from "@/components/admin";
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
      <AdminLoadingState label="Loading pricing…" testID="hotel-pricing-detail-loading" />
    );
  }

  if (error || !data) {
    return (
      <AdminScreen testID="hotel-pricing-detail-error">
        <Stack.Screen options={{ title: "Pricing detail", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Pricing row not found"}
          onRetry={() => void load()}
          testID="hotel-pricing-detail-error-state"
        />
      </AdminScreen>
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
    <AdminScreen
      testID="hotel-pricing-detail"
      bottomInset={Spacing.xl}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={Colors.primary}
        />
      }
    >
      <Stack.Screen options={{ title: "Pricing detail", headerShown: false }} />
      <AdminTopBar
        title="Pricing detail"
        subtitle={hotel.name}
        onBackPress={() => router.back()}
        testID="hotel-pricing-detail-header"
        rightSlot={
          <View style={styles.headerActions}>
            <AdminTopBarIconButton
              icon="create-outline"
              label="Edit hotel pricing"
              testID="hotel-pricing-edit"
              onPress={() =>
                router.push(
                  `/admin/operations/hotels/${hotelId}/pricing/${pricingId}?mode=edit` as never
                )
              }
            />
            <AdminTopBarIconButton
              icon="trash-outline"
              label="Delete hotel pricing"
              testID="hotel-pricing-delete"
              disabled={deleting}
              onPress={() =>
                Alert.alert("Delete pricing?", "This removes the selected pricing period.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => void deletePricing() },
                ])
              }
            />
          </View>
        }
      />
      <View style={styles.priceHero}>
        <Text style={styles.priceLabel}>Nightly rate</Text>
        <Text style={styles.priceValue}>{inr(p.price)}</Text>
        <Text style={styles.dateRange}>
          {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
        </Text>
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
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 4 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  priceHero: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
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
    padding: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
  },
  noteText: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
});
