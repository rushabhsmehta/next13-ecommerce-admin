import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
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
  type HotelSpecialDatePricingDetailResponse,
} from "@/lib/operations";
import { HotelSpecialDatePricingForm } from "@/components/operations/HotelSpecialDatePricingForm";

function inr(n: number): string {
  return `Rs.${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
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

export default function HotelSpecialDatePricingDetailScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const { id: hotelId, specialPricingId, mode } = useLocalSearchParams<{
    id: string;
    specialPricingId: string;
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

  const [data, setData] = useState<HotelSpecialDatePricingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (loadMode: "initial" | "refresh" = "initial") => {
      if (!hotelId || !specialPricingId) return;
      if (loadMode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await client.getHotelSpecialDatePricing(hotelId, specialPricingId));
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load special date pricing."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hotelId, specialPricingId, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function deletePricing() {
    if (!hotelId || !specialPricingId) return;
    setDeleting(true);
    try {
      await client.deleteHotelSpecialDatePricing(hotelId, specialPricingId);
      router.replace(`/admin/operations/hotels/${hotelId}/pricing` as never);
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError
          ? err.message
          : "Could not delete special date pricing."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AdminLoadingState
        label="Loading special date pricing..."
        testID="hotel-special-date-pricing-detail-loading"
      />
    );
  }

  if (error || !data) {
    return (
      <AdminScreen testID="hotel-special-date-pricing-detail-error">
        <Stack.Screen options={{ title: "Special date pricing", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Special date pricing not found"}
          onRetry={() => void load()}
          testID="hotel-special-date-pricing-detail-error-state"
        />
      </AdminScreen>
    );
  }

  const { hotel, specialDatePricing: p } = data;
  const meal = p.mealPlanName ?? (p.mealPlanCode ? p.mealPlanCode : "None");

  if (String(mode ?? "") === "edit") {
    return (
      <PermissionGate permission="operations.write">
        <HotelSpecialDatePricingForm
          hotelId={hotelId}
          specialPricingId={specialPricingId}
          mode="edit"
          initial={{
            name: p.name,
            roomTypeId: p.roomTypeId,
            roomTypeName: p.roomTypeName ?? "",
            occupancyTypeId: p.occupancyTypeId,
            occupancyTypeName: p.occupancyTypeName ?? "",
            mealPlanId: p.mealPlanId ?? "",
            mealPlanName: meal,
            price: String(p.price),
            notes: p.notes,
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
      testID="hotel-special-date-pricing-detail"
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
      <Stack.Screen options={{ title: "Special date pricing", headerShown: false }} />
      <AdminTopBar
        title="Special date pricing"
        subtitle={hotel.name}
        onBackPress={() => router.back()}
        testID="hotel-special-date-pricing-detail-header"
        rightSlot={
          <View style={styles.headerActions}>
            <AdminTopBarIconButton
              icon="create-outline"
              label="Edit special date pricing"
              testID="hotel-special-date-pricing-edit"
              onPress={() =>
                router.push(
                  `/admin/operations/hotels/${hotelId}/special-date-pricing/${specialPricingId}?mode=edit` as never
                )
              }
            />
            <AdminTopBarIconButton
              icon="trash-outline"
              label="Delete special date pricing"
              testID="hotel-special-date-pricing-delete"
              disabled={deleting}
              onPress={() =>
                Alert.alert(
                  "Deactivate special date pricing?",
                  "This removes the override from active pricing.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Deactivate",
                      style: "destructive",
                      onPress: () => void deletePricing(),
                    },
                  ]
                )
              }
            />
          </View>
        }
      />
      <View style={styles.priceHero}>
        <Text style={styles.priceLabel}>{p.name}</Text>
        <Text style={styles.priceValue}>{inr(p.price)}</Text>
        <Text style={styles.dateRange}>
          {fmtDate(p.startDate)} - {fmtDate(p.endDate)}
        </Text>
      </View>

      <View style={styles.card}>
        <Row label="Room type" value={p.roomTypeName ?? "-"} />
        <Row label="Occupancy" value={p.occupancyTypeName ?? "-"} />
        <Row label="Meal plan" value={meal} />
        <Row label="Status" value={p.isActive ? "Active" : "Inactive"} />
        {p.notes ? <Row label="Notes" value={p.notes} /> : null}
      </View>

      <View style={styles.noteCard}>
        <Ionicons name="sparkles-outline" size={18} color={Colors.primary} />
        <Text style={styles.noteText}>
          This rate overrides normal hotel pricing only for the selected dates and
          matching room, occupancy, and meal plan.
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
