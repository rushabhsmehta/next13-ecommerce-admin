import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { associateApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  HOT_QUERY: "#ef4444",
  QUERY_SENT: "#3b82f6",
  CONFIRMED: "#16a34a",
  CANCELLED: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  HOT_QUERY: "Hot Query",
  QUERY_SENT: "Query Sent",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export default function InquiriesScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [inquiries, setInquiries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInquiries = useCallback(async () => {
    if (!token) return;
    try {
      const data = await associateApi.listInquiries(token, { limit: 50 });
      setInquiries(data.inquiries || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load inquiries:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const renderInquiry = ({ item }: { item: any }) => {
    const statusColor = STATUS_COLORS[item.status] || Colors.textSecondary;
    const statusLabel = STATUS_LABELS[item.status] || item.status;

    return (
      <View style={styles.card}>
        {/* Left accent */}
        <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />

        <View style={styles.cardBody}>
          {/* Top row: customer name + status */}
          <View style={styles.cardHeader}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.customerName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Details row */}
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={12} color={Colors.textTertiary} />
              <Text style={styles.detailText}>{item.location?.label || "—"}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textTertiary} />
              <Text style={styles.detailText}>
                {item.journeyDate
                  ? format(new Date(item.journeyDate), "dd MMM yyyy")
                  : "No date"}
              </Text>
            </View>
          </View>

          {/* Bottom row: pax + created */}
          <View style={styles.cardFooter}>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={12} color={Colors.textTertiary} />
              <Text style={styles.detailText}>
                {item.numAdults || 0} Adults
                {(item.numChildren5to11 || 0) + (item.numChildrenAbove11 || 0) + (item.numChildrenBelow5 || 0) > 0
                  ? ` · ${(item.numChildren5to11 || 0) + (item.numChildrenAbove11 || 0) + (item.numChildrenBelow5 || 0)} Children`
                  : ""}
              </Text>
            </View>
            <Text style={styles.createdAt}>
              {format(new Date(item.createdAt), "dd MMM")}
            </Text>
          </View>

          {/* Mobile number */}
          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.detailText}>{item.customerMobileNumber}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading inquiries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {total} {total === 1 ? "inquiry" : "inquiries"} submitted
        </Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => router.push("/inquiries/new" as any)}
        >
          <LinearGradient
            colors={[Colors.gradient1, Colors.gradient2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.newBtnGradient}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newBtnText}>New Inquiry</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {inquiries.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="document-text-outline" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No inquiries yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap "New Inquiry" to submit your first customer inquiry.
          </Text>
          <Pressable
            style={styles.emptyNewBtn}
            onPress={() => router.push("/inquiries/new" as any)}
          >
            <LinearGradient
              colors={[Colors.gradient1, Colors.gradient2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.newBtnGradient}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.newBtnText}>Submit Inquiry</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={inquiries}
          keyExtractor={(item) => item.id}
          renderItem={renderInquiry}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchInquiries();
              }}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xxxl,
    gap: Spacing.md,
  },
  loadingText: { fontSize: FontSize.md, color: Colors.textSecondary },

  // Summary bar
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  newBtn: { borderRadius: BorderRadius.full, overflow: "hidden" },
  newBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  newBtnText: { fontSize: FontSize.sm, fontWeight: "700", color: "#fff" },

  // List
  listContent: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.medium,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: Spacing.lg, gap: Spacing.sm },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  customerName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: "700" },

  detailsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    flexWrap: "wrap",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: { fontSize: FontSize.sm, color: Colors.textSecondary },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  createdAt: { fontSize: FontSize.xs, color: Colors.textTertiary },

  // Empty state
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyNewBtn: { borderRadius: BorderRadius.lg, overflow: "hidden", marginTop: Spacing.sm },
});
