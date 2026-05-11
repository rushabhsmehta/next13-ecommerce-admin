import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { withAuth } from "@/lib/api";
import { createAssociateInquiryClient, type AssociateInquiry } from "@/lib/associate-inquiries";
import { Colors, BorderRadius, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function AssociateInquiryListScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { isAssociate } = useCurrentUser();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inquiries, setInquiries] = useState<AssociateInquiry[]>([]);

  const client = useMemo(
    () => createAssociateInquiryClient(withAuth(() => getTokenRef.current())),
    []
  );

  const fetchInquiries = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setInquiries(await client.listInquiries());
    } catch {
      setInquiries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [client]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={inquiries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={inquiries.length ? styles.listContent : styles.centered}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchInquiries(true);
            }}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              {isAssociate ? "No associate inquiries yet" : "No CRM inquiries yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              Create your first inquiry to start tracking follow-ups.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/associate/inquiries/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text style={styles.secondary}>{item.location?.label ?? "Unknown location"}</Text>
            <Text style={styles.secondary}>{item.customerMobileNumber}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/associate/inquiries/new")}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.fabText}>Create Inquiry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 88 },
  emptyWrap: { alignItems: "center", paddingHorizontal: 24 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text },
  emptySubtitle: { marginTop: 8, color: Colors.textTertiary, textAlign: "center" },
  card: {
    backgroundColor: Colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 6,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  customerName: { color: Colors.text, fontWeight: "700", fontSize: FontSize.md, flex: 1 },
  status: { color: Colors.primary, fontWeight: "600", fontSize: FontSize.xs },
  secondary: { color: Colors.textSecondary, fontSize: FontSize.sm },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fabText: { color: "#fff", fontWeight: "700" },
});
