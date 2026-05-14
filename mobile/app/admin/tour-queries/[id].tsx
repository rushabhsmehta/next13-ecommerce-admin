import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { API_BASE_URL } from "@/constants/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

interface FlightDetail {
  id: string;
  date: string | null;
  flightName: string | null;
  flightNumber: string | null;
  from: string | null;
  to: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  flightDuration: string | null;
}

interface VariantSnapshot {
  id: string;
  name: string;
  sortOrder: number | null;
  sourceVariantId: string | null;
}

interface RoomAllocationDetail {
  id: string;
  quantity: number | null;
  customRoomType: string | null;
  roomType: { name: string } | null;
  occupancyType: { name: string } | null;
  mealPlan: { name: string } | null;
}

interface TransportDetailItem {
  id: string;
  quantity: number | null;
  description: string | null;
  vehicleType: { name: string } | null;
}

interface ItineraryItem {
  id: string;
  dayNumber: number | null;
  days: string | null;
  itineraryTitle: string | null;
  itineraryDescription: string | null;
  mealsIncluded: string | null;
  hotel: { id: string; name: string } | null;
  roomAllocations: RoomAllocationDetail[];
  transportDetails: TransportDetailItem[];
}

interface TourQueryDetail {
  id: string;
  tourPackageQueryNumber: string | null;
  tourPackageQueryName: string | null;
  tourPackageQueryType: string | null;
  tourCategory: string | null;
  customerName: string | null;
  customerNumber: string | null;
  numDaysNight: string | null;
  period: string | null;
  tourStartsFrom: string | null;
  tourEndsOn: string | null;
  numAdults: string | null;
  numChild5to12: string | null;
  numChild0to5: string | null;
  transport: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  price: string | null;
  pricePerAdult: string | null;
  pricePerChildOrExtraBed: string | null;
  pricePerChild5to12YearsNoBed: string | null;
  pricePerChildwithSeatBelow5Years: string | null;
  totalPrice: string | null;
  remarks: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  confirmedVariantId: string | null;
  assignedTo: string | null;
  assignedToMobileNumber: string | null;
  assignedToEmail: string | null;
  createdAt: string;
  updatedAt: string;
  location: { id: string; label: string } | null;
  associatePartner: { id: string; name: string } | null;
  inquiry: {
    id: string;
    customerName: string | null;
    customerMobileNumber: string | null;
    status: string | null;
  } | null;
  flightDetails: FlightDetail[];
  queryVariantSnapshots: VariantSnapshot[];
  itineraries: ItineraryItem[];
  inclusionsList: string[];
  exclusionsList: string[];
  importantNotesList: string[];
  paymentPolicyList: string[];
  usefulTipList: string[];
  cancellationPolicyList: string[];
  airlineCancellationPolicyList: string[];
  termsconditionsList: string[];
  kitchenGroupPolicyList: string[];
}

function getAdminBase(): string {
  return API_BASE_URL.replace(/\/$/, "");
}

function formatDate(s: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(
      "en-IN",
      opts ?? { day: "2-digit", month: "short", year: "numeric" }
    );
  } catch {
    return "—";
  }
}

function formatINR(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function buildRoomLabel(r: RoomAllocationDetail): string {
  const parts: string[] = [];
  const qty = r.quantity && r.quantity > 0 ? `${r.quantity}× ` : "";
  const rt = r.customRoomType || r.roomType?.name || "Room";
  parts.push(`${qty}${rt}`);
  if (r.occupancyType?.name) parts.push(r.occupancyType.name);
  if (r.mealPlan?.name) parts.push(r.mealPlan.name);
  return parts.join(" · ");
}

function buildTransportLabel(t: TransportDetailItem): string {
  const qty = t.quantity && t.quantity > 0 ? `${t.quantity}× ` : "";
  const vt = t.vehicleType?.name ?? "Vehicle";
  return t.description ? `${qty}${vt} — ${t.description}` : `${qty}${vt}`;
}

export default function TourQueryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const [data, setData] = useState<TourQueryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await request<TourQueryDetail>(
          `/api/mobile/tour-queries/${id}`,
          { retries: 1 }
        );
        setData(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load query.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, request]
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const shareUrl = useMemo(() => {
    if (!id) return "";
    return `${getAdminBase()}/tourPackageQueryDisplay/${id}`;
  }, [id]);
  const pdfUrl = useMemo(() => {
    if (!id) return "";
    return `${getAdminBase()}/tourPackageQueryPDFGenerator/${id}`;
  }, [id]);

  const callCustomer = useCallback((phone: string | null | undefined) => {
    if (!phone) {
      Alert.alert("No phone number", "This customer doesn't have a phone number on file.");
      return;
    }
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, "")}`).catch(() => {
      Alert.alert("Couldn't place call", "Your device does not support phone calls.");
    });
  }, []);

  const messageOnWhatsApp = useCallback((phone: string | null | undefined) => {
    if (!phone) return;
    const cleaned = phone.replace(/[^0-9]/g, "");
    Linking.openURL(`https://wa.me/${cleaned}`).catch(() => {
      Alert.alert("WhatsApp not available", "Could not open WhatsApp.");
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (!data) return;
    const title =
      data.tourPackageQueryName ||
      data.tourPackageQueryNumber ||
      "Tour Query";
    try {
      await Share.share({
        title,
        message: `${title}\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      /* user cancelled */
    }
  }, [data, shareUrl]);

  const openPdf = useCallback(() => {
    if (!pdfUrl) return;
    Linking.openURL(pdfUrl).catch(() => {
      Alert.alert("Couldn't open PDF", "Failed to open the PDF link.");
    });
  }, [pdfUrl]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={36} color={Colors.error} />
        <Text style={styles.emptyTitle}>{error ?? "Tour query not found"}</Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => void load("initial")}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={styles.primaryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const status = data.isArchived
    ? "Archived"
    : data.isFeatured
    ? "Confirmed"
    : "Draft";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Tour Query", headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {data.tourPackageQueryName ?? "Tour Query"}
          </Text>
          {data.tourPackageQueryNumber ? (
            <Text style={styles.headerSubtitle}>{data.tourPackageQueryNumber}</Text>
          ) : null}
        </View>
        <Pressable
          style={styles.iconBtn}
          onPress={handleShare}
          accessibilityLabel="Share"
        >
          <Ionicons name="share-outline" size={20} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.row}>
            <View
              style={[
                styles.statusBadge,
                status === "Confirmed"
                  ? styles.statusConfirmed
                  : status === "Archived"
                  ? styles.statusArchived
                  : styles.statusDraft,
              ]}
            >
              <Text style={styles.statusBadgeText}>{status}</Text>
            </View>
            {data.tourPackageQueryType ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{data.tourPackageQueryType}</Text>
              </View>
            ) : null}
            {data.tourCategory ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{data.tourCategory}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Text style={styles.heroMetaLabel}>Travel</Text>
              <Text style={styles.heroMetaValue}>
                {data.tourStartsFrom
                  ? `${formatDate(data.tourStartsFrom, {
                      day: "2-digit",
                      month: "short",
                    })}${
                      data.tourEndsOn
                        ? ` → ${formatDate(data.tourEndsOn, {
                            day: "2-digit",
                            month: "short",
                          })}`
                        : ""
                    }`
                  : "—"}
              </Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Text style={styles.heroMetaLabel}>Duration</Text>
              <Text style={styles.heroMetaValue}>{data.numDaysNight ?? "—"}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Text style={styles.heroMetaLabel}>Pax</Text>
              <Text style={styles.heroMetaValue}>
                {data.numAdults ? `${data.numAdults}A` : "—"}
                {data.numChild5to12 ? ` · ${data.numChild5to12}C` : ""}
                {data.numChild0to5 ? ` · ${data.numChild0to5}I` : ""}
              </Text>
            </View>
          </View>
          {data.totalPrice ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total price</Text>
              <Text style={styles.priceValue}>{formatINR(data.totalPrice)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            testID="tour-query-action-call"
            accessibilityRole="button"
            accessibilityLabel="Call customer"
            style={styles.actionBtn}
            onPress={() => callCustomer(data.customerNumber)}
          >
            <Ionicons name="call-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Call</Text>
          </Pressable>
          <Pressable
            testID="tour-query-action-whatsapp"
            accessibilityRole="button"
            accessibilityLabel="Open WhatsApp"
            style={styles.actionBtn}
            onPress={() => messageOnWhatsApp(data.customerNumber)}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.actionText}>WhatsApp</Text>
          </Pressable>
          <Pressable
            testID="tour-query-action-pdf"
            accessibilityRole="button"
            accessibilityLabel="Open PDF"
            style={styles.actionBtn}
            onPress={openPdf}
          >
            <Ionicons name="document-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>PDF</Text>
          </Pressable>
        </View>

        <Section title="Customer">
          <Row label="Name" value={data.customerName ?? "—"} />
          <Row label="Phone" value={data.customerNumber ?? "—"} />
          {data.location?.label ? (
            <Row label="Destination" value={data.location.label} />
          ) : null}
          {data.associatePartner?.name ? (
            <Row label="Associate" value={data.associatePartner.name} />
          ) : null}
          {data.assignedTo ? <Row label="Assigned to" value={data.assignedTo} /> : null}
        </Section>

        {data.queryVariantSnapshots.length ? (
          <Section title={`Variants (${data.queryVariantSnapshots.length})`}>
            {data.queryVariantSnapshots.map((v) => (
              <View key={v.id} style={styles.variantRow}>
                <Ionicons
                  name={
                    data.confirmedVariantId === v.sourceVariantId ||
                    data.confirmedVariantId === v.id
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={16}
                  color={
                    data.confirmedVariantId === v.sourceVariantId ||
                    data.confirmedVariantId === v.id
                      ? Colors.success ?? "#16a34a"
                      : Colors.textTertiary
                  }
                />
                <Text style={styles.variantName}>{v.name}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {data.itineraries.length ? (
          <Section title={`Itinerary (${data.itineraries.length} days)`}>
            {data.itineraries.map((it) => (
              <View key={it.id} style={styles.dayCard}>
                <View style={styles.dayHead}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>
                      D{it.dayNumber ?? "?"}
                    </Text>
                  </View>
                  <Text style={styles.dayTitle} numberOfLines={2}>
                    {it.itineraryTitle ?? "Untitled"}
                  </Text>
                </View>
                {it.itineraryDescription ? (
                  <Text style={styles.dayDescription} numberOfLines={4}>
                    {it.itineraryDescription.replace(/<[^>]+>/g, "")}
                  </Text>
                ) : null}
                {it.hotel?.name ? (
                  <View style={styles.miniRow}>
                    <Ionicons name="bed-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.miniRowText}>{it.hotel.name}</Text>
                  </View>
                ) : null}
                {it.mealsIncluded ? (
                  <View style={styles.miniRow}>
                    <Ionicons name="restaurant-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.miniRowText}>{it.mealsIncluded}</Text>
                  </View>
                ) : null}
                {it.roomAllocations.length
                  ? it.roomAllocations.map((r) => (
                      <View key={r.id} style={styles.miniRow}>
                        <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.miniRowText}>{buildRoomLabel(r)}</Text>
                      </View>
                    ))
                  : null}
                {it.transportDetails.length
                  ? it.transportDetails.map((t) => (
                      <View key={t.id} style={styles.miniRow}>
                        <Ionicons name="car-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.miniRowText}>{buildTransportLabel(t)}</Text>
                      </View>
                    ))
                  : null}
              </View>
            ))}
          </Section>
        ) : null}

        {data.flightDetails.length ? (
          <Section title="Flights">
            {data.flightDetails.map((f) => (
              <View key={f.id} style={styles.flightCard}>
                <Text style={styles.flightHead}>
                  {f.flightName ?? ""} {f.flightNumber ? `· ${f.flightNumber}` : ""}
                </Text>
                <Text style={styles.flightRoute}>
                  {f.from ?? "—"} → {f.to ?? "—"}
                </Text>
                <Text style={styles.flightMeta}>
                  {formatDate(f.date)}
                  {f.departureTime ? ` · ${f.departureTime}` : ""}
                  {f.arrivalTime ? ` → ${f.arrivalTime}` : ""}
                  {f.flightDuration ? ` · ${f.flightDuration}` : ""}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}

        <PricingSection data={data} />

        <PolicyList title="Inclusions" items={data.inclusionsList} />
        <PolicyList title="Exclusions" items={data.exclusionsList} />
        <PolicyList title="Important Notes" items={data.importantNotesList} />
        <PolicyList title="Payment Policy" items={data.paymentPolicyList} />
        <PolicyList title="Cancellation Policy" items={data.cancellationPolicyList} />
        <PolicyList title="Useful Tips" items={data.usefulTipList} />
        <PolicyList title="Terms & Conditions" items={data.termsconditionsList} />

        {data.remarks ? (
          <Section title="Remarks">
            <Text style={styles.bodyText}>{data.remarks}</Text>
          </Section>
        ) : null}

        <Text style={styles.metaFoot}>
          Updated {formatDate(data.updatedAt)} · Created {formatDate(data.createdAt)}
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function PolicyList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Section title={title}>
      {items.map((item, i) => (
        <View key={`${title}-${i}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item.replace(/<[^>]+>/g, "")}</Text>
        </View>
      ))}
    </Section>
  );
}

function PricingSection({ data }: { data: TourQueryDetail }) {
  const lines: Array<[string, string | null]> = [
    ["Per Adult", data.pricePerAdult],
    ["Per Child (with bed)", data.pricePerChildOrExtraBed],
    ["Per Child 5-12 (no bed)", data.pricePerChild5to12YearsNoBed],
    ["Per Child < 5", data.pricePerChildwithSeatBelow5Years],
  ];
  const visible = lines.filter(([, v]) => v && v.trim());
  if (!visible.length && !data.price) return null;
  return (
    <Section title="Pricing">
      {data.price ? <Row label="Price summary" value={data.price} /> : null}
      {visible.map(([label, value]) => (
        <Row key={label} label={label} value={formatINR(value)} />
      ))}
      {data.totalPrice ? <Row label="Total" value={formatINR(data.totalPrice)} /> : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary },
  scroll: { paddingHorizontal: Spacing.lg },
  hero: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusConfirmed: { backgroundColor: "#dcfce7" },
  statusDraft: { backgroundColor: Colors.primaryBg },
  statusArchived: { backgroundColor: Colors.surfaceAlt },
  statusBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.text,
    textTransform: "uppercase",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  tagText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textSecondary },
  heroMetaRow: { flexDirection: "row", gap: Spacing.md },
  heroMetaItem: { flex: 1 },
  heroMetaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroMetaValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginTop: 2,
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  priceLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "700" },
  priceValue: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  actionRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  section: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  sectionBody: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: 8,
  },
  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.md },
  kvLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flexShrink: 0 },
  kvValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  dayCard: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 6,
  },
  dayHead: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  dayBadgeText: { color: "#fff", fontSize: FontSize.xs, fontWeight: "900" },
  dayTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  dayDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  miniRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  miniRowText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1 },
  variantRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  variantName: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "700" },
  flightCard: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 2,
  },
  flightHead: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  flightRoute: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "700" },
  flightMeta: { fontSize: FontSize.xs, color: Colors.textTertiary },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bulletDot: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  bodyText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  metaFoot: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  primaryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  primaryBtnText: { color: "#fff", fontSize: FontSize.sm, fontWeight: "800" },
});
