import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createOperationsClient, type HotelDetail } from "@/lib/operations";
import { HotelForm } from "@/components/operations/HotelForm";

export default function HotelDetailScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("operations.write");
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [data, setData] = useState<HotelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await client.getHotel(id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load hotel.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  function confirmDelete() {
    if (!data) return;
    const { summary } = data;
    Alert.alert(
      `Delete ${data.hotel.name}?`,
      summary.linkedCount > 0
        ? `This hotel has ${summary.linkedCount} linked record(s) and cannot be deleted. Remove pricing rows first if needed.`
        : "This permanently removes the hotel.",
      summary.linkedCount > 0
        ? [{ text: "OK", style: "cancel" }]
        : [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => void doDelete(),
            },
          ]
    );
  }

  async function doDelete() {
    if (!id) return;
    setBusy(true);
    try {
      await client.deleteHotel(id);
      router.back();
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not delete hotel."
      );
    } finally {
      setBusy(false);
    }
  }

  if (editing && data) {
    const h = data.hotel;
    return (
      <HotelForm
        mode="edit"
        hotelId={h.id}
        initial={{
          name: h.name,
          locationId: h.locationId,
          locationLabel: h.locationLabel,
          destinationId: h.destinationId ?? "",
          destinationLabel: h.destinationName ?? "",
          link: h.link ?? "",
          images: h.images,
        }}
      />
    );
  }

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
        <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
        <Text style={styles.errText}>{error ?? "Not found"}</Text>
        <Pressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const { hotel, summary } = data;
  const hero = hotel.images[0]?.url;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen options={{ title: hotel.name, headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {hotel.name}
        </Text>
        {canWrite ? (
          <>
            <Pressable
              testID={`hotel-edit-${hotel.id}`}
              accessibilityRole="button"
              accessibilityLabel="Edit hotel"
              style={styles.iconBtn}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={20} color={Colors.text} />
            </Pressable>
            <Pressable
              testID={`hotel-delete-${hotel.id}`}
              accessibilityRole="button"
              accessibilityLabel="Delete hotel"
              style={styles.iconBtn}
              disabled={busy}
              onPress={confirmDelete}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </Pressable>
          </>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
        {hero ? (
          <Image
            source={{ uri: hero }}
            style={styles.hero}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        {hotel.images.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {hotel.images.map((img, i) => (
              <Image
                key={`${img.url}-${i}`}
                source={{ uri: img.url }}
                style={styles.galleryThumb}
                accessibilityIgnoresInvertColors
              />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.card}>
          <Row label="Location" value={hotel.locationLabel} />
          {hotel.destinationName ? (
            <Row label="Destination" value={hotel.destinationName} />
          ) : null}
          {hotel.link ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Open booking link"
              onPress={() => Linking.openURL(hotel.link!)}
            >
              <Row label="Link" value={hotel.link} />
            </Pressable>
          ) : null}
          <Row label="Photos" value={String(hotel.images.length)} />
        </View>

        <Pressable
          testID={`hotel-pricing-link-${hotel.id}`}
          accessibilityRole="button"
          accessibilityLabel={`View hotel pricing, ${summary.pricingCount} rows`}
          style={styles.pricingLink}
          onPress={() =>
            router.push(`/admin/operations/hotels/${hotel.id}/pricing` as never)
          }
        >
          <View style={styles.pricingLinkInner}>
            <Ionicons name="pricetag-outline" size={20} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pricingLinkTitle}>Seasonal pricing</Text>
              <Text style={styles.pricingLinkSub}>
                {summary.pricingCount} row(s) - view and edit on mobile
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </View>
        </Pressable>

        <View style={styles.statGrid}>
          <Stat label="Pricing rows" value={summary.pricingCount} />
          <Stat label="Itineraries" value={summary.itineraryCount} />
          <Stat label="Itinerary master" value={summary.itineraryMasterCount} />
          <Stat label="Variant links" value={summary.variantMappings + summary.variantSnapshots} />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  errText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, textAlign: "center" },
  retry: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  gallery: { marginBottom: Spacing.md },
  galleryThumb: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  row: { gap: 2 },
  rowLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  rowValue: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  pricingLink: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
    overflow: "hidden",
  },
  pricingLinkInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  pricingLinkTitle: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  pricingLinkSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  noteCard: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    marginBottom: Spacing.md,
  },
  noteText: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
  },
  statValue: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});
