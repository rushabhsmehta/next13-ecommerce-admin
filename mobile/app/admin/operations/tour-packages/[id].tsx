import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { ApiError, withAuth } from "@/lib/api";
import { API_BASE_URL } from "@/constants/api";
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
import {
  createTourPackagesClient,
  type TourPackageDetail,
} from "@/lib/tour-packages";
import {
  TourPackageForm,
  type TourPackageFormInitial,
} from "@/components/tour-packages/TourPackageForm";
import { downloadAndSharePdf } from "@/lib/pdf-download";
import {
  absoluteAdminUrl,
  tourPackagePdfPath,
  tourPackagePdfWithVariantsPath,
} from "@/lib/tour-packages-web-urls";

export default function TourPackageDetailScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { permissions, isAdmin, isOperations } = useCurrentUser();
  const canWrite =
    permissions.includes("operations.write") || isAdmin || isOperations;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createTourPackagesClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [data, setData] = useState<TourPackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<"plain" | "variants" | null>(null);

  const pdfWebUrl = useMemo(
    () => (id ? absoluteAdminUrl(API_BASE_URL, tourPackagePdfPath(id)) : ""),
    [id]
  );
  const pdfVariantsWebUrl = useMemo(
    () =>
      id ? absoluteAdminUrl(API_BASE_URL, tourPackagePdfWithVariantsPath(id)) : "",
    [id]
  );

  const sharePdf = useCallback(
    async (variant: boolean, fallbackWebUrl: string) => {
      if (!id) return;
      setPdfBusy(variant ? "variants" : "plain");
      try {
        const name =
          data?.tourPackageName?.trim().replace(/\s+/g, "-") || "tour-package";
        await downloadAndSharePdf({
          endpoint: `/api/mobile/tour-packages/${encodeURIComponent(id)}/pdf${
            variant ? "?variant=1" : ""
          }`,
          fileName: variant ? `${name}-variants` : name,
          getToken: () => getTokenRef.current(),
          dialogTitle: variant ? "Share package PDF (variants)" : "Share package PDF",
        });
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not generate the PDF.";
        Alert.alert("PDF unavailable", message, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open in browser",
            onPress: () => {
              if (fallbackWebUrl) void Linking.openURL(fallbackWebUrl);
            },
          },
        ]);
      } finally {
        setPdfBusy(null);
      }
    },
    [id, data]
  );

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await client.get(id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load package.");
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

  if (loading && !data) {
    return <AdminLoadingState label="Loading package…" testID="tour-package-detail-loading" />;
  }

  if (error || !data) {
    return (
      <AdminScreen testID="tour-package-detail-error">
        <AdminErrorState
          message={error ?? "Package not found"}
          onRetry={() => void load()}
          testID="tour-package-detail-error-state"
        />
      </AdminScreen>
    );
  }

  if (editing && canWrite) {
    const initial: TourPackageFormInitial = {
      locationId: data.locationId,
      locationLabel: data.location.label,
      tourPackageName: data.tourPackageName ?? "",
      tourPackageType: data.tourPackageType ?? "",
      tourCategory: data.tourCategory ?? "Domestic",
      numDaysNight: data.numDaysNight ?? "",
      transport: data.transport ?? "",
      pickup_location: data.pickup_location ?? "",
      drop_location: data.drop_location ?? "",
      price: data.price ?? "",
      itineraries: data.itineraries.map((day) => ({
        dayNumber: day.dayNumber ?? 1,
        itineraryTitle: day.itineraryTitle ?? "",
        itineraryDescription: day.itineraryDescription,
        mealsIncluded: day.mealsIncluded,
      })),
      images: data.images.map((img) => ({ url: img.url })),
      pricingSection: data.pricingSection ?? [],
      inclusions: data.inclusions ?? [],
      exclusions: data.exclusions ?? [],
      importantNotes: data.importantNotes ?? [],
      paymentPolicy: data.paymentPolicy ?? [],
      usefulTip: data.usefulTip ?? [],
      cancellationPolicy: data.cancellationPolicy ?? [],
      airlineCancellationPolicy: data.airlineCancellationPolicy ?? [],
      termsconditions: data.termsconditions ?? [],
      kitchenGroupPolicy: data.kitchenGroupPolicy ?? [],
    };
    return (
      <TourPackageForm
        mode="edit"
        packageId={data.id}
        initial={initial}
      />
    );
  }

  const summaryParts = [
    data.location.label,
    data.tourPackageType,
    data.tourCategory,
    data.numDaysNight,
  ].filter(Boolean);

  return (
    <AdminScreen testID="tour-package-detail-screen">
      <Stack.Screen options={{ title: "Tour package", headerShown: false }} />
      <AdminTopBar
        title={data.tourPackageName?.trim() || "Tour package"}
        subtitle={summaryParts.join(" · ") || "Package details"}
        onBackPress={() => router.back()}
        testID="tour-package-detail-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarIconButton
              icon="create-outline"
              accessibilityLabel="Edit package"
              testID="tour-package-edit"
              onPress={() => setEditing(true)}
            />
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
        {data.isArchived ? (
          <View style={styles.banner}>
            <Ionicons name="archive-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.bannerText}>This package is archived on the website.</Text>
          </View>
        ) : null}

        {data.images.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {data.images.map((img) => (
              <Image
                key={img.id}
                source={{ uri: img.url }}
                style={styles.heroImage}
                accessibilityLabel="Package photo"
              />
            ))}
          </ScrollView>
        ) : null}

        <Section title="Overview">
          <InfoRow label="Destination" value={data.location.label} />
          <InfoRow label="Type" value={data.tourPackageType ?? "—"} />
          <InfoRow label="Category" value={data.tourCategory ?? "—"} />
          <InfoRow label="Duration" value={data.numDaysNight ?? "—"} />
          <InfoRow label="Price" value={data.price ?? "—"} />
        </Section>

        <Section title="Travel">
          <InfoRow label="Transport" value={data.transport ?? "—"} />
          <InfoRow label="Pickup" value={data.pickup_location ?? "—"} />
          <InfoRow label="Drop" value={data.drop_location ?? "—"} />
        </Section>

        <Section title={`Itinerary (${data.itineraryCount} days)`}>
          {data.itineraries.length === 0 ? (
            <Text style={styles.muted}>No itinerary days yet.</Text>
          ) : (
            data.itineraries.map((day) => (
              <View key={day.id} style={styles.dayBlock}>
                <Text style={styles.dayLabel}>Day {day.dayNumber ?? "—"}</Text>
                <Text style={styles.dayTitle}>{day.itineraryTitle ?? "Untitled"}</Text>
                {day.itineraryDescription ? (
                  <Text style={styles.dayDesc}>{day.itineraryDescription}</Text>
                ) : null}
                {day.mealsIncluded ? (
                  <Text style={styles.dayMeals}>Meals: {day.mealsIncluded}</Text>
                ) : null}
              </View>
            ))
          )}
        </Section>

        {data.pricingSection.length > 0 ? (
          <Section title="Pricing table">
            {data.pricingSection.map((row, i) => (
              <View key={`pricing-${i}`} style={styles.policyRow}>
                <Text style={styles.infoLabel}>{row.name}</Text>
                <Text style={styles.infoValue}>{row.price || "—"}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        <PolicySection title="Inclusions" items={data.inclusions} />
        <PolicySection title="Exclusions" items={data.exclusions} />
        <PolicySection title="Important notes" items={data.importantNotes} />
        <PolicySection title="Payment policy" items={data.paymentPolicy} />
        <PolicySection title="Cancellation" items={data.cancellationPolicy} />

        <Section title="Share">
          <View style={styles.pdfRow}>
            <Pressable
              testID="tour-package-share-pdf"
              accessibilityRole="button"
              accessibilityLabel="Share package PDF"
              accessibilityHint="Generates a PDF and opens the device share sheet."
              style={styles.actionBtn}
              disabled={pdfBusy !== null}
              onPress={() => void sharePdf(false, pdfWebUrl)}
            >
              {pdfBusy === "plain" ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="document-outline" size={18} color={Colors.primary} />
              )}
              <Text style={styles.actionText}>Download PDF</Text>
            </Pressable>
            {data.variantCount > 0 ? (
              <Pressable
                testID="tour-package-share-pdf-variants"
                accessibilityRole="button"
                accessibilityLabel="Share package PDF with variants"
                style={styles.actionBtn}
                disabled={pdfBusy !== null}
                onPress={() => void sharePdf(true, pdfVariantsWebUrl)}
              >
                {pdfBusy === "variants" ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="documents-outline" size={18} color={Colors.primary} />
                )}
                <Text style={styles.actionText}>PDF with variants</Text>
              </Pressable>
            ) : null}
          </View>
        </Section>

        {canWrite ? (
          <View style={styles.actions}>
            <Pressable
              testID="tour-package-manage-variants"
              accessibilityRole="button"
              accessibilityLabel="Manage package variants"
              style={styles.actionBtn}
              onPress={() =>
                router.push(
                  `/admin/operations/tour-packages/${data.id}/variants` as never
                )
              }
            >
              <Ionicons name="layers-outline" size={18} color={Colors.primary} />
              <Text style={styles.actionText}>
                Variants ({data.variantCount})
              </Text>
            </Pressable>
            <Pressable
              testID="tour-package-manage-pricing"
              accessibilityRole="button"
              accessibilityLabel="Manage seasonal pricing"
              style={styles.actionBtn}
              onPress={() =>
                router.push(
                  `/admin/operations/tour-packages/${data.id}/pricing` as never
                )
              }
            >
              <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
              <Text style={styles.actionText}>
                Seasonal pricing ({data.pricingCount})
              </Text>
            </Pressable>
            <Pressable
              testID="tour-package-create-trip"
              accessibilityRole="button"
              accessibilityLabel="Create trip from this package"
              style={styles.actionBtn}
              onPress={() => router.push("/admin/tour-queries/create" as never)}
            >
              <Ionicons name="map-outline" size={18} color={Colors.primary} />
              <Text style={styles.actionText}>Create sales trip from package</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </AdminScreen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function PolicySection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Section title={title}>
      {items.map((item, i) => (
        <Text key={`${title}-${i}`} style={styles.bullet}>
          • {item}
        </Text>
      ))}
    </Section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  imageRow: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  heroImage: {
    width: 220,
    height: 140,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  bannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionBody: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    flex: 1,
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: "600",
    flex: 1.4,
    textAlign: "right",
  },
  policyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  bullet: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  muted: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  dayBlock: {
    gap: 4,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dayLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
  },
  dayTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  dayDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  dayMeals: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  actions: { gap: Spacing.sm },
  pdfRow: { gap: Spacing.sm },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.primary,
  },
});
