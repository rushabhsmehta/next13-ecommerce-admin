import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";
import { format } from "date-fns";
import { buildTelUrl, buildWaMeUrl } from "@/constants/whatsapp";
import { mobileAppVariantHeaders } from "@/lib/app-variant";
import { API_BASE_URL } from "@/constants/api";

interface Inquiry {
  id: string;
  status: string;
  location: string;
  numAdults: number;
  numChildrenAbove11: number;
  numChildren5to11: number;
  numChildrenBelow5: number;
  journeyDate: string | null;
  nextFollowUpDate: string | null;
  assignedStaff: { name: string; email: string } | null;
  latestQuote: { id: string; createdAt: string } | null;
  createdAt: string;
  updatedAt: string;
  lastAction: { actionType: string; remarks: string; actionDate: string } | null;
  coupon: {
    code: string;
    status: string;
    discountAmount: number | null;
    validationMessage: string | null;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:    { label: "Pending",    color: "#92400e", bg: "#fef3c7", icon: "time-outline" },
  HOT_QUERY:  { label: "Hot Lead",   color: "#9a3412", bg: "#fee2e2", icon: "flame-outline" },
  QUERY_SENT: { label: "Query Sent", color: "#1e40af", bg: "#dbeafe", icon: "send-outline" },
  CONFIRMED:  { label: "Confirmed",  color: "#14532d", bg: "#dcfce7", icon: "checkmark-circle-outline" },
  CANCELLED:  { label: "Cancelled",  color: "#6b7280", bg: "#f3f4f6", icon: "close-circle-outline" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: Colors.textSecondary, bg: Colors.surfaceAlt, icon: "ellipse-outline" };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function CouponBadge({ coupon }: { coupon: NonNullable<Inquiry["coupon"]> }) {
  const applied = coupon.status === "APPLIED" || coupon.status === "VALIDATED" || coupon.status === "APPROVED";
  const color = applied ? "#14532d" : coupon.status === "REJECTED" ? "#991b1b" : "#92400e";
  const bg = applied ? "#dcfce7" : coupon.status === "REJECTED" ? "#fee2e2" : "#fef3c7";
  return (
    <View style={[styles.couponBadge, { backgroundColor: bg }]}>
      <Ionicons name="pricetag-outline" size={11} color={color} />
      <Text style={[styles.couponBadgeText, { color }]} numberOfLines={1}>
        {coupon.code} - {coupon.status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

export default function MyInquiriesScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const insets = useSafeAreaInsets();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInquiries = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getTokenRef.current();
      const res = await fetch(`${API_BASE_URL}/api/mobile/my-inquiries`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...mobileAppVariantHeaders(),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.inquiries ?? []);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={inquiries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={
        inquiries.length === 0
          ? { flex: 1 }
          : { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: insets.bottom + 24, gap: Spacing.md }
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchInquiries(true); }}
          tintColor={Colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons name="document-text-outline" size={36} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No enquiries yet</Text>
          <Text style={styles.emptySubtitle}>
            Browse our packages and tap "Enquire Now" to submit a tour request.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.push("/")}>
            <Text style={styles.emptyButtonText}>Browse Packages</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => <InquiryCard inquiry={item} />}
    />
  );
}

function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const journeyDateStr = inquiry.journeyDate
    ? format(new Date(inquiry.journeyDate), "dd MMM yyyy")
    : null;
  const nextFollowUpStr = inquiry.nextFollowUpDate
    ? format(new Date(inquiry.nextFollowUpDate), "dd MMM yyyy")
    : null;
  const createdStr = format(new Date(inquiry.createdAt), "dd MMM yyyy");
  const totalChildren =
    inquiry.numChildrenAbove11 + inquiry.numChildren5to11 + inquiry.numChildrenBelow5;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={14} color={Colors.primary} />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>{inquiry.location}</Text>
        </View>
        <StatusBadge status={inquiry.status} />
      </View>

      <View style={styles.cardBody}>
        <InfoChip icon="people-outline" label={`${inquiry.numAdults} adult${inquiry.numAdults !== 1 ? "s" : ""}`} />
        {totalChildren > 0 ? (
          <InfoChip icon="happy-outline" label={`${totalChildren} child${totalChildren !== 1 ? "ren" : ""}`} />
        ) : null}
        {journeyDateStr && (
          <InfoChip icon="calendar-outline" label={journeyDateStr} />
        )}
        <InfoChip icon="time-outline" label={`Submitted ${createdStr}`} />
        {inquiry.coupon ? <CouponBadge coupon={inquiry.coupon} /> : null}
      </View>

      <View style={styles.timelineBox}>
        <TimelineRow
          icon="person-circle-outline"
          label="Assigned to"
          value={inquiry.assignedStaff?.name ?? "Team Aagam"}
        />
        <TimelineRow
          icon="calendar-number-outline"
          label="Next follow-up"
          value={nextFollowUpStr ?? "Our team will update you soon"}
        />
        <TimelineRow
          icon="document-attach-outline"
          label="Quote"
          value={inquiry.latestQuote ? "Quote is being prepared" : "Not generated yet"}
        />
      </View>

      {inquiry.lastAction && (
        <View style={styles.lastActionRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={12} color={Colors.textTertiary} />
          <Text style={styles.lastActionText} numberOfLines={2}>
            {inquiry.lastAction.remarks}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.cardId}>#{inquiry.id.slice(0, 8).toUpperCase()}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Linking.openURL(
                buildWaMeUrl(`Hi, I need an update on enquiry #${inquiry.id.slice(0, 8).toUpperCase()}.`)
              )
            }
          >
            <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
            <Text style={styles.actionButtonText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(buildTelUrl())}
          >
            <Ionicons name="call-outline" size={13} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function TimelineRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.timelineRow}>
      <Ionicons name={icon} size={13} color={Colors.primary} />
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function InfoChip({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={11} color={Colors.textSecondary} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
    backgroundColor: Colors.background,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  emptyButtonText: { color: "#fff", fontWeight: "800" },

  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flex: 1 },
  locationIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  locationText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, flex: 1 },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: "700" },

  cardBody: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  chipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "500" },
  couponBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    maxWidth: "100%",
  },
  couponBadgeText: { fontSize: FontSize.xs, fontWeight: "800", flexShrink: 1 },

  lastActionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  lastActionText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 17 },

  timelineBox: {
    gap: 7,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
  },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timelineLabel: {
    width: 92,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  timelineValue: { flex: 1, fontSize: FontSize.xs, color: Colors.text, fontWeight: "600" },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cardId: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "600", fontVariant: ["tabular-nums"] },
  actionRow: { flexDirection: "row", gap: Spacing.sm },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    backgroundColor: Colors.background,
  },
  actionButtonText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "700" },
});
