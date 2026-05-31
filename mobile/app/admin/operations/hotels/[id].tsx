import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarIconButton,
} from "@/components/admin";
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
    return <AdminLoadingState label="Loading hotel…" testID="hotel-detail-loading" />;
  }

  if (error || !data) {
    return (
      <AdminScreen testID="hotel-detail-error">
        <Stack.Screen options={{ title: "Hotel", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Hotel not found"}
          onRetry={() => void load()}
          testID="hotel-detail-error-state"
        />
      </AdminScreen>
    );
  }

  const { hotel, summary } = data;
  const hero = hotel.images[0]?.url?.trim();
  const galleryImages = hotel.images
    .map((img) => img.url.trim())
    .filter(Boolean);

  return (
    <AdminScreen
      testID="hotel-detail-screen"
      bottomInset={Spacing.xl}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={Colors.primary}
        />
      }
    >
      <Stack.Screen options={{ title: hotel.name, headerShown: false }} />
      <AdminTopBar
        title={hotel.name}
        subtitle={hotel.locationLabel}
        onBackPress={() => router.back()}
        testID="hotel-detail-header"
        rightSlot={
          canWrite ? (
            <View style={styles.headerActions}>
              <AdminTopBarIconButton
                icon="create-outline"
                label="Edit hotel"
                testID={`hotel-edit-${hotel.id}`}
                onPress={() => setEditing(true)}
              />
              <AdminTopBarIconButton
                icon="trash-outline"
                label="Delete hotel"
                testID={`hotel-delete-${hotel.id}`}
                disabled={busy}
                onPress={confirmDelete}
              />
            </View>
          ) : null
        }
      />
      {hero ? (
        <RemoteImage uri={hero} style={styles.hero} accessibilityIgnoresInvertColors />
      ) : null}
      {galleryImages.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {galleryImages.map((url, i) => (
            <RemoteImage
              key={`${url}-${i}`}
              uri={url}
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
    </AdminScreen>
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
  headerActions: { flexDirection: "row", gap: 4 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  hero: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceAlt,
  },
  gallery: { marginBottom: 0 },
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
