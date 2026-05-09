import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";

interface CampaignCounters {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  responded: number;
  pending: number;
  retry: number;
}

interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  templateName: string;
  templateLanguage: string;
  status: string;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  rateLimit: number;
  retryFailed: boolean;
  maxRetries: number;
  counters: CampaignCounters;
  createdAt: string;
  updatedAt: string;
}

interface Recipient {
  id: string;
  phoneNumber: string;
  name: string | null;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  respondedAt: string | null;
}

interface RecipientResponse {
  items: Recipient[];
  nextCursor: string | null;
}

const RECIPIENT_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "read", label: "Read" },
  { value: "failed", label: "Failed" },
];

function statusColor(status: string): string {
  switch (status) {
    case "completed":
    case "read":
    case "delivered":
      return "#16a34a";
    case "sent":
      return "#0ea5e9";
    case "sending":
      return "#0ea5e9";
    case "failed":
      return "#dc2626";
    case "scheduled":
      return "#a855f7";
    case "pending":
    case "retry":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

const LAUNCHABLE_STATUSES = new Set(["draft", "scheduled", "paused"]);

export default function WhatsAppCampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaignId = id ? decodeURIComponent(id) : "";
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const api = useRef(withAuth(getToken)).current;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [launching, setLaunching] = useState(false);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientCursor, setRecipientCursor] = useState<string | null>(null);
  const [recipientFilter, setRecipientFilter] = useState<string>("all");
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Campaign",
      headerBackTitle: "Campaigns",
    });
  }, [navigation]);

  const fetchCampaign = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      try {
        const data = await api<CampaignDetail>(
          `/api/mobile/whatsapp/campaigns/${encodeURIComponent(campaignId)}`,
        );
        setCampaign(data);
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : "Could not load campaign.";
        if (!opts.silent) Alert.alert("WhatsApp", message);
      }
    },
    [api, campaignId],
  );

  const fetchRecipientsPage = useCallback(
    async (cursor: string | null, opts: { append?: boolean } = {}) => {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (recipientFilter !== "all") params.set("status", recipientFilter);
      if (cursor) params.set("cursor", cursor);
      try {
        const data = await api<RecipientResponse>(
          `/api/mobile/whatsapp/campaigns/${encodeURIComponent(campaignId)}/recipients?${params.toString()}`,
        );
        setRecipients((prev) =>
          opts.append ? [...prev, ...data.items] : data.items,
        );
        setRecipientCursor(data.nextCursor);
      } catch {
        /* silent — cards are still useful */
      }
    },
    [api, campaignId, recipientFilter],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void Promise.all([fetchCampaign(), fetchRecipientsPage(null)]).finally(
        () => {
          if (!cancelled) setLoading(false);
        },
      );
      return () => {
        cancelled = true;
      };
    }, [fetchCampaign, fetchRecipientsPage]),
  );

  // Re-fetch recipients when filter changes.
  useEffect(() => {
    void fetchRecipientsPage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientFilter]);

  async function loadMoreRecipients() {
    if (!recipientCursor || loadingRecipients) return;
    setLoadingRecipients(true);
    await fetchRecipientsPage(recipientCursor, { append: true });
    setLoadingRecipients(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      fetchCampaign({ silent: true }),
      fetchRecipientsPage(null),
    ]);
    setRefreshing(false);
  }

  function confirmLaunch() {
    if (!campaign) return;
    if (!LAUNCHABLE_STATUSES.has(campaign.status)) {
      Alert.alert(
        "Cannot launch",
        `Campaigns in status "${campaign.status}" cannot be re-launched from mobile.`,
      );
      return;
    }
    const eligible = campaign.counters.pending + campaign.counters.retry;
    if (eligible === 0) {
      Alert.alert("Nothing to send", "There are no pending recipients on this campaign.");
      return;
    }
    Alert.alert(
      "Launch campaign?",
      `${eligible.toLocaleString()} recipient${eligible === 1 ? "" : "s"} will receive "${campaign.templateName}".`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Launch",
          style: "destructive",
          onPress: launch,
        },
      ],
    );
  }

  async function launch() {
    if (!campaign) return;
    setLaunching(true);
    try {
      await api(
        `/api/mobile/whatsapp/campaigns/${encodeURIComponent(campaign.id)}/launch`,
        { method: "POST", body: {} },
      );
      Alert.alert("Queued", "Campaign queued for the worker. Stats will update automatically.");
      await fetchCampaign({ silent: true });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not queue campaign.";
      Alert.alert("Launch failed", message);
    } finally {
      setLaunching(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center} testID="wa-campaign-loading">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.center}>
        <Ionicons name="megaphone-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyText}>Campaign not found.</Text>
      </View>
    );
  }

  const canLaunch = LAUNCHABLE_STATUSES.has(campaign.status);
  const tint = statusColor(campaign.status);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: canLaunch ? 92 + insets.bottom : insets.bottom + 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#25D366"
          />
        }
      >
        <View style={styles.headerCard}>
          <View style={[styles.statusPill, { backgroundColor: tint + "22" }]}>
            <View style={[styles.statusDot, { backgroundColor: tint }]} />
            <Text style={[styles.statusText, { color: tint }]}>
              {campaign.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{campaign.name}</Text>
          {campaign.description ? (
            <Text style={styles.description}>{campaign.description}</Text>
          ) : null}
          <Text style={styles.subtle}>
            {campaign.templateName} · {campaign.templateLanguage} · rate{" "}
            {campaign.rateLimit}/min
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <Stat label="Total" value={campaign.counters.total} />
          <Stat label="Pending" value={campaign.counters.pending + campaign.counters.retry} tint="#f59e0b" />
          <Stat label="Sent" value={campaign.counters.sent} tint="#0ea5e9" />
          <Stat label="Delivered" value={campaign.counters.delivered} tint="#0ea5e9" />
          <Stat label="Read" value={campaign.counters.read} tint="#16a34a" />
          <Stat label="Failed" value={campaign.counters.failed} tint="#dc2626" />
        </View>

        <View style={styles.metaCard}>
          {campaign.scheduledFor ? (
            <MetaRow label="Scheduled for" value={new Date(campaign.scheduledFor).toLocaleString("en-IN")} />
          ) : null}
          {campaign.startedAt ? (
            <MetaRow label="Started at" value={new Date(campaign.startedAt).toLocaleString("en-IN")} />
          ) : null}
          {campaign.completedAt ? (
            <MetaRow label="Completed at" value={new Date(campaign.completedAt).toLocaleString("en-IN")} />
          ) : null}
          <MetaRow label="Created" value={new Date(campaign.createdAt).toLocaleString("en-IN")} />
          <MetaRow
            label="Retry on failure"
            value={`${campaign.retryFailed ? "Yes" : "No"} · max ${campaign.maxRetries}`}
          />
        </View>

        <Text style={styles.section}>Recipients</Text>
        <FlatList
          data={RECIPIENT_FILTERS}
          keyExtractor={(s) => s.value}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusRow}
          renderItem={({ item }) => {
            const active = recipientFilter === item.value;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setRecipientFilter(item.value)}
                testID={`wa-campaign-recipients-${item.value}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {recipients.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No recipients in this filter.</Text>
          </View>
        ) : (
          recipients.map((r) => (
            <View key={r.id} style={styles.recipient}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recipientName} numberOfLines={1}>
                  {r.name || r.phoneNumber}
                </Text>
                {r.name ? (
                  <Text style={styles.recipientPhone}>{r.phoneNumber}</Text>
                ) : null}
                {r.errorMessage ? (
                  <Text style={styles.recipientError} numberOfLines={2}>
                    {r.errorMessage}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.statusPillSmall,
                  { backgroundColor: statusColor(r.status) + "22" },
                ]}
              >
                <Text style={[styles.statusTextSmall, { color: statusColor(r.status) }]}>
                  {r.status}
                </Text>
              </View>
            </View>
          ))
        )}

        {recipientCursor ? (
          <TouchableOpacity
            style={styles.loadMore}
            onPress={loadMoreRecipients}
            disabled={loadingRecipients}
            testID="wa-campaign-load-more"
          >
            {loadingRecipients ? (
              <ActivityIndicator color="#25D366" />
            ) : (
              <Text style={styles.loadMoreText}>Load more</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {canLaunch && (
        <View style={[styles.launchBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[styles.launchBtn, launching && styles.launchBtnDisabled]}
            onPress={confirmLaunch}
            disabled={launching}
            accessibilityLabel="Launch campaign"
            testID="wa-campaign-launch"
          >
            {launching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={18} color="#fff" />
                <Text style={styles.launchBtnText}>Launch now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Stat({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tint ? { color: tint } : null]}>
        {value.toLocaleString()}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: "center" },
  scroll: { padding: 16, gap: 16 },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  name: { fontSize: 18, fontWeight: "700", color: Colors.text },
  description: { fontSize: 13, color: Colors.text },
  subtle: { fontSize: 12, color: Colors.textTertiary },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  statusPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTextSmall: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stat: {
    width: "31%",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  statValue: { fontSize: 18, fontWeight: "700", color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  metaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  metaLabel: { fontSize: 12, color: Colors.textTertiary },
  metaValue: { fontSize: 13, color: Colors.text, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  section: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 4,
  },
  statusRow: { gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    marginRight: 6,
  },
  chipActive: { backgroundColor: "#25D366" },
  chipText: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  recipient: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  recipientName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  recipientPhone: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  recipientError: { fontSize: 11, color: "#b91c1c", marginTop: 2 },
  empty: { alignItems: "center", padding: 24 },
  loadMore: {
    paddingVertical: 12,
    alignItems: "center",
  },
  loadMoreText: { color: "#25D366", fontWeight: "700" },
  launchBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  launchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    paddingVertical: 14,
    borderRadius: 24,
  },
  launchBtnDisabled: { opacity: 0.5 },
  launchBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
