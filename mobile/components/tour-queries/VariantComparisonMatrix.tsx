import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import type {
  VariantBuildContext,
  VariantComparisonItem,
} from "@/lib/tour-query-pricing";
import {
  formatRoomAllocationLine,
  formatTransportLine,
  resolveVariantHotelName,
  resolveVariantRooms,
  resolveVariantTransport,
} from "./variant-build-utils";
import {
  formatDiscountLabel,
  hasAppliedVariantDiscount,
} from "@/lib/variant-pricing-discount";

function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function toAmount(value: unknown): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

type MatrixRow = {
  key: string;
  label: string;
  values: Array<string>;
  highlightCheapest?: boolean;
};

function buildPriceRows(
  variants: VariantComparisonItem[],
  cheapestId: string | null
): MatrixRow[] {
  const rows: MatrixRow[] = [
    {
      key: "totalCost",
      label: "Total",
      highlightCheapest: true,
      values: variants.map((variant) =>
        variant.pricing ? formatINR(variant.pricing.totalCost) : "—"
      ),
    },
    {
      key: "basePrice",
      label: "Base",
      values: variants.map((variant) =>
        variant.pricing ? formatINR(variant.pricing.basePrice) : "—"
      ),
    },
    {
      key: "markup",
      label: "Markup",
      values: variants.map((variant) =>
        variant.pricing
          ? `${formatINR(variant.pricing.markupAmount)} (${variant.pricing.markupPercentage}%)`
          : "—"
      ),
    },
    {
      key: "accommodation",
      label: "Stay",
      values: variants.map((variant) =>
        variant.pricing ? formatINR(variant.pricing.accommodation) : "—"
      ),
    },
    {
      key: "transport",
      label: "Transport",
      values: variants.map((variant) =>
        variant.pricing ? formatINR(variant.pricing.transport) : "—"
      ),
    },
  ];

  const anyDiscount = variants.some((variant) =>
    hasAppliedVariantDiscount(variant.pricing?.appliedDiscount)
  );
  if (anyDiscount) {
    rows.push({
      key: "discount",
      label: "Discount",
      values: variants.map((variant) => {
        if (!hasAppliedVariantDiscount(variant.pricing?.appliedDiscount)) return "—";
        return `${formatDiscountLabel(variant.pricing!.appliedDiscount)} (−${formatINR(
          variant.pricing!.discountAmount ?? variant.pricing!.appliedDiscount?.amount
        )})`;
      }),
    });
  }

  const componentLabels = new Set<string>();
  for (const variant of variants) {
    for (const component of variant.pricing?.components ?? []) {
      const name = (component.name || "").trim();
      if (name) componentLabels.add(name);
    }
  }
  for (const label of Array.from(componentLabels)) {
    rows.push({
      key: `component:${label}`,
      label,
      values: variants.map((variant) => {
        const match = (variant.pricing?.components ?? []).find(
          (component) => (component.name || "").trim() === label
        );
        return match ? formatINR(toAmount(match.price)) : "—";
      }),
    });
  }

  // Silence unused — cheapest used by caller for column header styling
  void cheapestId;
  return rows;
}

export function VariantComparisonMatrix({
  variants,
  build,
  cheapestId,
}: {
  variants: VariantComparisonItem[];
  build: VariantBuildContext | null;
  cheapestId: string | null;
}) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const pricedOrAll = useMemo(() => {
    const priced = variants.filter((variant) => variant.pricing);
    return priced.length > 0 ? priced : variants;
  }, [variants]);

  const rows = useMemo(
    () => buildPriceRows(pricedOrAll, cheapestId),
    [cheapestId, pricedOrAll]
  );

  if (variants.length < 2) return null;

  return (
    <View style={styles.wrap} testID="variant-comparison-matrix">
      <Text style={styles.heading}>Price comparison</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.labelCell, styles.headCell]}>Metric</Text>
            {pricedOrAll.map((variant) => {
              const isCheapest = cheapestId === variant.id && Boolean(variant.pricing);
              const isConfirmed = variant.isConfirmed;
              return (
                <View
                  key={variant.id}
                  style={[
                    styles.cell,
                    styles.valueCell,
                    styles.headCell,
                    isConfirmed || isCheapest ? styles.highlightCell : null,
                  ]}
                >
                  <Text style={styles.headName} numberOfLines={2}>
                    {variant.name || "Unnamed"}
                  </Text>
                  {isConfirmed ? (
                    <Text style={styles.headBadge}>Confirmed</Text>
                  ) : isCheapest ? (
                    <Text style={styles.headBadge}>Best value</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
          {rows.map((row) => (
            <View key={row.key} style={styles.row}>
              <Text style={[styles.cell, styles.labelCell]} numberOfLines={2}>
                {row.label}
              </Text>
              {row.values.map((value, index) => {
                const variant = pricedOrAll[index];
                const highlight =
                  row.highlightCheapest &&
                  cheapestId === variant?.id &&
                  Boolean(variant?.pricing);
                return (
                  <Text
                    key={`${row.key}-${variant?.id ?? index}`}
                    style={[
                      styles.cell,
                      styles.valueCell,
                      highlight || variant?.isConfirmed ? styles.highlightCell : null,
                    ]}
                    numberOfLines={3}
                  >
                    {value}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {build && build.itineraries.length > 0 ? (
        <View style={styles.hotelSection} testID="variant-hotel-day-compare">
          <Text style={styles.heading}>Hotel by night</Text>
          {build.itineraries.map((itinerary, index) => {
            const dayLabel = itinerary.dayNumber ?? index + 1;
            const expanded = Boolean(expandedDays[itinerary.id]);
            return (
              <View key={itinerary.id} style={styles.dayCard}>
                <Pressable
                  testID={`variant-hotel-day-toggle-${itinerary.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${dayLabel} hotel comparison`}
                  accessibilityState={{ expanded }}
                  style={styles.dayHead}
                  onPress={() =>
                    setExpandedDays((prev) => ({
                      ...prev,
                      [itinerary.id]: !prev[itinerary.id],
                    }))
                  }
                >
                  <Text style={styles.dayTitle}>Day {dayLabel}</Text>
                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={Colors.textSecondary}
                  />
                </Pressable>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.dayColumns}>
                    {variants.map((variant) => {
                      const hotelName = resolveVariantHotelName(
                        variant,
                        build,
                        itinerary.id,
                        itinerary.dayNumber,
                        itinerary.hotel
                      );
                      const rooms = resolveVariantRooms(variant, build, itinerary.id);
                      const transport = resolveVariantTransport(
                        variant,
                        build,
                        itinerary.id
                      );
                      return (
                        <View key={`${itinerary.id}-${variant.id}`} style={styles.dayCol}>
                          <Text style={styles.dayVariantName} numberOfLines={1}>
                            {variant.name}
                          </Text>
                          <Text style={styles.dayHotel} numberOfLines={2}>
                            {hotelName}
                          </Text>
                          {expanded ? (
                            <View style={styles.dayDetails}>
                              {rooms.length === 0 ? (
                                <Text style={styles.dayMuted}>No rooms</Text>
                              ) : (
                                rooms.map((room, roomIndex) => (
                                  <Text
                                    key={`${itinerary.id}-${variant.id}-room-${roomIndex}`}
                                    style={styles.dayDetailLine}
                                  >
                                    {formatRoomAllocationLine(
                                      room as Record<string, unknown>,
                                      build
                                    )}
                                  </Text>
                                ))
                              )}
                              {transport.length === 0 ? (
                                <Text style={styles.dayMuted}>No transport</Text>
                              ) : (
                                transport.map((row, transportIndex) => (
                                  <Text
                                    key={`${itinerary.id}-${variant.id}-transport-${transportIndex}`}
                                    style={styles.dayDetailLine}
                                  >
                                    {formatTransportLine(
                                      row as Record<string, unknown>,
                                      build
                                    )}
                                  </Text>
                                ))
                              )}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const COLUMN_WIDTH = 128;

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  heading: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cell: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    fontSize: FontSize.xs,
    color: Colors.text,
  },
  labelCell: {
    width: 88,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  valueCell: {
    width: COLUMN_WIDTH,
  },
  headCell: {
    fontWeight: "800",
    backgroundColor: Colors.surfaceAlt,
  },
  highlightCell: {
    backgroundColor: "#ECFDF5",
  },
  headName: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.text,
  },
  headBadge: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: Colors.success,
  },
  hotelSection: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  dayCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  dayHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayTitle: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  dayColumns: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dayCol: {
    width: COLUMN_WIDTH,
    gap: 4,
  },
  dayVariantName: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  dayHotel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.text,
  },
  dayDetails: {
    gap: 2,
  },
  dayDetailLine: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  dayMuted: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
