import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AdminSegmentedControl } from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { VARIANT_BUILD_TABS } from "./tab-config";
import type { VariantBuildTabId } from "./types";
import type { VariantBuildContext, VariantComparisonItem } from "@/lib/tour-query-pricing";
import {
  formatRoomAllocationLine,
  formatTransportLine,
  resolveVariantHotelName,
  resolveVariantRooms,
  resolveVariantTransport,
} from "./variant-build-utils";

function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "Rs. 0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function VariantBuildPanel({
  queryId,
  variant,
  build,
  canWriteSales,
}: {
  queryId: string;
  variant: VariantComparisonItem;
  build: VariantBuildContext;
  canWriteSales: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<VariantBuildTabId>("hotels");

  const dayRows = useMemo(
    () =>
      build.itineraries.map((it, idx) => ({
        ...it,
        dayLabel: it.dayNumber ?? idx + 1,
        hotelName: resolveVariantHotelName(variant, build, it.id, it.dayNumber, it.hotel),
        rooms: resolveVariantRooms(variant, build, it.id),
        transport: resolveVariantTransport(variant, build, it.id),
      })),
    [build, variant]
  );

  return (
    <View style={styles.wrap} testID={`variant-build-${variant.id}`}>
      <AdminSegmentedControl
        options={VARIANT_BUILD_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
        value={activeTab}
        onChange={setActiveTab}
        testIDPrefix={`variant-build-${variant.id}`}
        scrollable
      />

      {activeTab === "hotels" ? (
        <View style={styles.panel} testID={`variant-build-hotels-${variant.id}`}>
          {dayRows.length === 0 ? (
            <Text style={styles.empty}>Add itinerary days on the Hotels tab first.</Text>
          ) : (
            dayRows.map((day) => (
              <View key={day.id} style={styles.dayCard}>
                <Text style={styles.dayTitle}>
                  Day {day.dayLabel}
                  {day.itineraryTitle ? ` · ${day.itineraryTitle.replace(/<[^>]+>/g, "")}` : ""}
                </Text>
                <View style={styles.row}>
                  <Ionicons name="bed-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.rowText}>{day.hotelName}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}

      {activeTab === "rooms" ? (
        <View style={styles.panel} testID={`variant-build-rooms-${variant.id}`}>
          {dayRows.length === 0 ? (
            <Text style={styles.empty}>No itinerary days configured.</Text>
          ) : (
            dayRows.map((day) => (
              <View key={day.id} style={styles.dayCard}>
                <Text style={styles.dayTitle}>Day {day.dayLabel}</Text>
                {day.rooms.length === 0 ? (
                  <Text style={styles.muted}>No room allocations</Text>
                ) : (
                  day.rooms.map((row, idx) => (
                    <Text key={`${day.id}-room-${idx}`} style={styles.bullet}>
                      · {formatRoomAllocationLine(row as Record<string, unknown>, build)}
                    </Text>
                  ))
                )}
              </View>
            ))
          )}
        </View>
      ) : null}

      {activeTab === "pricing" ? (
        <View style={styles.panel} testID={`variant-build-pricing-${variant.id}`}>
          {variant.pricing ? (
            <>
              <Text style={styles.total}>{formatINR(variant.pricing.totalCost)}</Text>
              <Text style={styles.muted}>
                Base {formatINR(variant.pricing.basePrice)} · Markup{" "}
                {formatINR(variant.pricing.markupAmount)} ({variant.pricing.markupPercentage}%)
              </Text>
              <View style={styles.split}>
                <Text style={styles.splitItem}>
                  Stay {formatINR(variant.pricing.accommodation)}
                </Text>
                <Text style={styles.splitItem}>
                  Transport {formatINR(variant.pricing.transport)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.empty}>Pricing not computed for this variant yet.</Text>
          )}
          {canWriteSales ? (
            <Pressable
              testID={`variant-build-pricing-edit-${variant.id}`}
              accessibilityRole="button"
              accessibilityLabel="Edit variant pricing"
              style={styles.editBtn}
              onPress={() =>
                router.push(
                  `/admin/tour-queries/${queryId}/variants/${variant.id}/pricing` as never
                )
              }
            >
              <Ionicons name="calculator-outline" size={15} color={Colors.primary} />
              <Text style={styles.editBtnText}>
                {variant.pricing ? "Edit pricing" : "Add pricing"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  panel: { gap: Spacing.sm },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: 6,
  },
  dayTitle: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  bullet: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  muted: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: "600" },
  empty: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
    paddingVertical: Spacing.sm,
  },
  total: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  split: { flexDirection: "row", gap: Spacing.md },
  splitItem: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textSecondary },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  editBtnText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
});
