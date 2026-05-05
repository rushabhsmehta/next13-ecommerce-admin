import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";
import { format } from "date-fns";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

interface Inquiry {
  id: string;
  status: string;
  location: string;
  numAdults: number;
  journeyDate: string | null;
  createdAt: string;
  updatedAt: string;
  lastAction: { actionType: string; remarks: string; actionDate: string } | null;
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

export default function MyInquiriesScreen() {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInquiries = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/mobile/my-inquiries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.inquiries ?? []);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [getToken]);

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
  const createdStr = format(new Date(inquiry.createdAt), "dd MMM yyyy");

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
        {journeyDateStr && (
          <InfoChip icon="calendar-outline" label={journeyDateStr} />
        )}
        <InfoChip icon="time-outline" label={`Submitted ${createdStr}`} />
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
        <Text style={styles.footerHint}>Our team will contact you shortly</Text>
      </View>
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
  footerHint: { fontSize: FontSize.xs, color: Colors.textTertiary },
});
