import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface TripReadinessItem {
  id: string;
  label: string;
  ok: boolean;
}

export interface TripReadinessBarProps {
  items: TripReadinessItem[];
  summary: string;
  testID?: string;
}

export function TripReadinessBar({ items, summary, testID = "trip-detail-readiness" }: TripReadinessBarProps) {
  return (
    <View style={styles.wrap} testID={testID} accessibilityRole="summary" accessibilityLabel={`Readiness. ${summary}`}>
      <View style={styles.row}>
        {items.map((it) => (
          <View key={it.id} style={styles.tick} accessibilityElementsHidden>
            <Ionicons
              name={it.ok ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={it.ok ? (Colors.success ?? "#16a34a") : Colors.textTertiary}
            />
            <Text style={[styles.tickLabel, !it.ok ? styles.tickMuted : null]} allowFontScaling={false}>
              {it.label}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.summary} allowFontScaling={false}>
        {summary}
      </Text>
    </View>
  );
}

/** UI-only readiness for trip detail **/
export function buildDetailReadinessItems(input: {
  isArchived?: boolean;
  customerNumber: string | null | undefined;
  tourStartsFrom: string | null | undefined;
  numAdults: string | null | undefined;
  numChild5to12: string | null | undefined;
  numChild0to5: string | null | undefined;
  itineraryDayCount: number;
  totalPrice: string | null | undefined;
  variantCount: number;
  confirmedVariantId: string | null | undefined;
}): { items: TripReadinessItem[]; summary: string } {
  const phoneOk = !!(input.customerNumber && input.customerNumber.trim());
  const datesOk = !!(input.tourStartsFrom && String(input.tourStartsFrom).trim());
  const paxOk = !!(
    (input.numAdults && Number(input.numAdults) > 0) ||
    (input.numChild5to12 && Number(input.numChild5to12) > 0) ||
    (input.numChild0to5 && Number(input.numChild0to5) > 0)
  );
  const itineraryOk = input.itineraryDayCount > 0;
  const pricingOk = (() => {
    if (!input.totalPrice) return false;
    const n = Number.parseFloat(String(input.totalPrice));
    return Number.isFinite(n);
  })();
  const variantOk =
    input.variantCount > 0 ||
    !!(input.confirmedVariantId && String(input.confirmedVariantId).trim());

  const items: TripReadinessItem[] = [
    { id: "phone", label: "Phone", ok: phoneOk },
    { id: "dates", label: "Dates", ok: datesOk },
    { id: "pax", label: "Pax", ok: paxOk },
    { id: "itin", label: "Days", ok: itineraryOk },
    { id: "price", label: "Price", ok: pricingOk },
    { id: "var", label: "Variant", ok: variantOk },
  ];

  if (input.isArchived) {
    return { items, summary: "Archived trips stay out of active trip lists." };
  }

  let summary = "Ready to share";
  if (!pricingOk || !variantOk) {
    summary = "Needs pricing before sharing";
  }
  if (!datesOk || !paxOk) {
    summary = "Missing dates and pax";
  }

  return { items, summary };
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    rowGap: 6,
  },
  tick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 4,
  },
  tickLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  tickMuted: { color: Colors.textTertiary },
  summary: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 20,
  },
});
