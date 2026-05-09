import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { API_BASE_URL } from "@/constants/api";

interface Flow {
  id: string;
  name: string;
  status: string;
  categories: string[];
  validationErrors: number;
  jsonVersion: string | null;
  dataApiVersion: string | null;
  endpointUri: string | null;
}

interface FlowsResponse {
  items: Flow[];
  count: number;
  error?: string;
}

function statusColor(status: string): string {
  switch (status) {
    case "PUBLISHED":
      return "#16a34a";
    case "DRAFT":
      return "#f59e0b";
    case "DEPRECATED":
      return "#94a3b8";
    case "BLOCKED":
    case "THROTTLED":
      return "#dc2626";
    default:
      return "#64748b";
  }
}

export default function WhatsAppFlowsList() {
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const api = useRef(withAuth(getToken)).current;

  const [items, setItems] = useState<Flow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Flows",
      headerBackTitle: "WhatsApp",
    });
  }, [navigation]);

  const fetchFlows = useCallback(async () => {
    try {
      const data = await api<FlowsResponse>("/api/mobile/whatsapp/flows");
      setItems(data.items ?? []);
      setError(data.error ?? null);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not load flows.";
      setError(message);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void fetchFlows().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [fetchFlows]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchFlows();
    setRefreshing(false);
  }

  function openInWeb(flow: Flow) {
    const editorPath = `/whatsapp/flows?flowId=${encodeURIComponent(flow.id)}`;
    const url = `${API_BASE_URL}${editorPath}`;
    Alert.alert(
      flow.name,
      "Editing flows requires a desktop browser. Open in web?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open in browser",
          onPress: () => {
            Linking.openURL(url).catch(() =>
              Alert.alert("Could not open", "Unable to open the flow in a browser."),
            );
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.center} testID="wa-flows-loading">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Ionicons name="information-circle-outline" size={16} color="#075E54" />
        <Text style={styles.bannerText}>
          Flows are read-only on mobile. Tap a flow to open the editor in your web browser.
        </Text>
      </View>

      {error && items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchFlows}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(f) => f.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#25D366"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flash-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>
                No flows yet. Build one on the web to use it from WhatsApp.
              </Text>
            </View>
          }
          contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: 24 }}
          renderItem={({ item }) => {
            const tint = statusColor(item.status);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => openInWeb(item)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name} in browser`}
                testID={`wa-flow-${item.id}`}
              >
                <View style={[styles.iconWrap, { backgroundColor: tint + "1a" }]}>
                  <Ionicons name="flash" size={20} color={tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View
                      style={[styles.statusPill, { backgroundColor: tint + "22" }]}
                    >
                      <Text style={[styles.statusText, { color: tint }]}>
                        {item.status}
                      </Text>
                    </View>
                    {item.validationErrors > 0 ? (
                      <View
                        style={[styles.statusPill, { backgroundColor: "#fef3c7" }]}
                      >
                        <Text style={[styles.statusText, { color: "#92400e" }]}>
                          {item.validationErrors} validation issue
                          {item.validationErrors === 1 ? "" : "s"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {item.categories.length > 0 ? (
                    <Text style={styles.categories} numberOfLines={1}>
                      {item.categories.join(" · ")}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="open-outline" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#E0F7E9",
  },
  bannerText: { fontSize: 12, color: "#075E54", flex: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: Colors.text },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  categories: { fontSize: 11, color: Colors.textTertiary, marginTop: 4 },
  empty: { alignItems: "center", padding: 40, gap: 12, flex: 1, justifyContent: "center" },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: "center" },
  errorText: { fontSize: 14, color: "#b91c1c", textAlign: "center" },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#25D366",
    borderRadius: 24,
  },
  retryText: { color: "#fff", fontWeight: "700" },
});
