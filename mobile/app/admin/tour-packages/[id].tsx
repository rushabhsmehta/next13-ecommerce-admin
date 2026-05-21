import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
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
} from "@/components/admin";
import { downloadAndSharePdf } from "@/lib/pdf-download";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface PackageDetail {
  id: string;
  tourPackageName: string | null;
  tourPackageType: string | null;
  tourCategory: string | null;
  numDaysNight: string | null;
  price: string | null;
  pricePerAdult: string | null;
  pricePerChildOrExtraBed: string | null;
  pricePerChild5to12YearsNoBed: string | null;
  pricePerChildwithSeatBelow5Years: string | null;
  transport: string | null;
  pickupLocation: string | null;
  dropLocation: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  location: { id: string; label: string } | null;
  itineraries: { id: string; dayNumber: number | null; days: string | null; itineraryTitle: string | null; hotel: { id: string; name: string } | null }[];
  variantCount: number;
}

export default function TourPackageDetailScreen() {
  return (
    <PermissionGate permission="salesTrips.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const api = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const { permissions } = useCurrentUser();
  const canWriteSales = permissions.includes("salesTrips.write");

  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState<"plain" | "variants" | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await api<PackageDetail>(
          `/api/mobile/tour-packages/${encodeURIComponent(id)}`
        );
        setPkg(data);
        setRenameDraft(data.tourPackageName ?? "");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load tour package.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api, id]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function patchField(field: string, value: unknown) {
    if (!id) return;
    setSavingField(field);
    try {
      const updated = await api<Partial<PackageDetail>>(
        `/api/mobile/tour-packages/${encodeURIComponent(id)}`,
        { method: "PATCH", body: { [field]: value } }
      );
      setPkg((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not save change."
      );
    } finally {
      setSavingField(null);
    }
  }

  async function commitRename() {
    if (!pkg) return;
    const next = renameDraft.trim();
    if (!next || next === pkg.tourPackageName) return;
    setRenaming(true);
    try {
      await patchField("tourPackageName", next);
    } finally {
      setRenaming(false);
    }
  }

  async function sharePdf(mode: "plain" | "variants") {
    if (!id) return;
    setPdfBusy(mode);
    try {
      const suffix = mode === "variants" ? "-variants" : "";
      const fileName = (pkg?.tourPackageName ?? "tour-package") + suffix;
      const query = mode === "variants" ? "?variant=1" : "";
      await downloadAndSharePdf({
        endpoint: `/api/mobile/tour-packages/${encodeURIComponent(id)}/pdf${query}`,
        fileName,
        getToken: () => getTokenRef.current(),
        dialogTitle: mode === "variants" ? "Share package (variants)" : "Share package",
      });
    } catch (err) {
      Alert.alert(
        "PDF unavailable",
        err instanceof ApiError ? err.message : "Could not generate the PDF."
      );
    } finally {
      setPdfBusy(null);
    }
  }

  if (loading) {
    return <AdminLoadingState label="Loading package…" testID="tour-package-loading" />;
  }
  if (error || !pkg) {
    return (
      <AdminScreen testID="tour-package-error">
        <AdminErrorState message={error ?? "Tour package not found."} onRetry={() => void load()} />
      </AdminScreen>
    );
  }

  const meta = [
    pkg.location?.label,
    pkg.numDaysNight,
    pkg.tourPackageType,
    pkg.tourCategory,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AdminScreen scroll={false} testID="tour-package-detail">
      <Stack.Screen options={{ title: "Package", headerShown: false }} />

      <AdminTopBar
        title={pkg.tourPackageName ?? "Untitled"}
        subtitle={meta || "Tour package"}
        onBackPress={() => router.back()}
        testID="tour-package-header"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pricing</Text>
          <PriceRow label="Headline price" value={pkg.price} />
          <PriceRow label="Per adult" value={pkg.pricePerAdult} />
          <PriceRow label="Per child / extra bed" value={pkg.pricePerChildOrExtraBed} />
          <PriceRow
            label="Child 5-12 (no bed)"
            value={pkg.pricePerChild5to12YearsNoBed}
          />
          <PriceRow
            label="Child < 5 with seat"
            value={pkg.pricePerChildwithSeatBelow5Years}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Logistics</Text>
          <PriceRow label="Transport" value={pkg.transport} />
          <PriceRow label="Pickup" value={pkg.pickupLocation} />
          <PriceRow label="Drop" value={pkg.dropLocation} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Itinerary</Text>
            <Text style={styles.cardHeaderMeta}>{pkg.itineraries.length} day(s)</Text>
          </View>
          {pkg.itineraries.length === 0 ? (
            <Text style={styles.muted}>No itinerary days yet.</Text>
          ) : (
            pkg.itineraries.slice(0, 8).map((it) => (
              <View key={it.id} style={styles.itineraryRow}>
                <Text style={styles.itineraryDay}>{it.dayNumber ?? "—"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itineraryTitle} numberOfLines={2}>
                    {it.itineraryTitle ?? "Untitled day"}
                  </Text>
                  {it.hotel ? (
                    <Text style={styles.itineraryHotel} numberOfLines={1}>
                      {it.hotel.name}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
          {pkg.itineraries.length > 8 ? (
            <Text style={styles.muted}>
              + {pkg.itineraries.length - 8} more day(s). Full itinerary edits stay on web.
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Documents</Text>
          <Pressable
            testID="tour-package-pdf"
            accessibilityRole="button"
            accessibilityLabel="Download PDF"
            disabled={pdfBusy !== null}
            style={[styles.actionBtn, pdfBusy === "plain" ? styles.actionBtnBusy : null]}
            onPress={() => void sharePdf("plain")}
          >
            {pdfBusy === "plain" ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
            )}
            <Text style={styles.actionText}>Share PDF</Text>
          </Pressable>
          <Pressable
            testID="tour-package-pdf-variants"
            accessibilityRole="button"
            accessibilityLabel="Download PDF with variants"
            disabled={pdfBusy !== null || pkg.variantCount === 0}
            style={[
              styles.actionBtn,
              pdfBusy === "variants" ? styles.actionBtnBusy : null,
              pkg.variantCount === 0 ? styles.actionBtnDisabled : null,
            ]}
            onPress={() => void sharePdf("variants")}
          >
            {pdfBusy === "variants" ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Ionicons name="documents-outline" size={16} color={Colors.primary} />
            )}
            <Text style={styles.actionText}>
              {pkg.variantCount > 0
                ? `Share PDF with variants (${pkg.variantCount})`
                : "No variants to include"}
            </Text>
          </Pressable>
        </View>

        {canWriteSales ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Edit</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.renameRow}>
              <TextInput
                testID="tour-package-rename"
                accessibilityLabel="Tour package name"
                style={styles.renameInput}
                value={renameDraft}
                onChangeText={setRenameDraft}
                placeholder="Package name"
                placeholderTextColor={Colors.textTertiary}
              />
              <Pressable
                testID="tour-package-rename-save"
                accessibilityRole="button"
                accessibilityLabel="Save name"
                disabled={
                  renaming ||
                  !renameDraft.trim() ||
                  renameDraft.trim() === (pkg.tourPackageName ?? "")
                }
                style={[
                  styles.saveBtn,
                  renaming ||
                  !renameDraft.trim() ||
                  renameDraft.trim() === (pkg.tourPackageName ?? "")
                    ? styles.actionBtnDisabled
                    : null,
                ]}
                onPress={() => void commitRename()}
              >
                {renaming ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </Pressable>
            </View>

            <ToggleRow
              label="Featured"
              testID="tour-package-toggle-featured"
              value={pkg.isFeatured}
              busy={savingField === "isFeatured"}
              onChange={(v) => void patchField("isFeatured", v)}
            />
            <ToggleRow
              label="Archived"
              testID="tour-package-toggle-archived"
              value={pkg.isArchived}
              busy={savingField === "isArchived"}
              onChange={(v) => void patchField("isArchived", v)}
            />
          </View>
        ) : null}

        <Text style={styles.footnote}>
          Hotels, itinerary days, room allocations, and variants are edited on the web.
        </Text>
      </ScrollView>
    </AdminScreen>
  );
}

function PriceRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue} numberOfLines={1}>
        {value ? value : "—"}
      </Text>
    </View>
  );
}

function ToggleRow({
  label,
  testID,
  value,
  busy,
  onChange,
}: {
  label: string;
  testID: string;
  value: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      {busy ? (
        <ActivityIndicator color={Colors.primary} size="small" />
      ) : (
        <Switch
          testID={testID}
          value={value}
          onValueChange={onChange}
          trackColor={{ true: Colors.primary, false: Colors.borderSubtle }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardHeaderMeta: { fontSize: FontSize.xs, color: Colors.textTertiary },
  cardTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  muted: { fontSize: FontSize.sm, color: Colors.textTertiary },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  priceValue: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
    marginLeft: Spacing.md,
    flexShrink: 0,
    maxWidth: "55%",
  },
  itineraryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  itineraryDay: {
    minWidth: 24,
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
  itineraryTitle: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  itineraryHotel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  actionBtnBusy: { opacity: 0.85 },
  actionBtnDisabled: { opacity: 0.4 },
  actionText: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.primary },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  renameRow: { flexDirection: "row", gap: Spacing.sm, alignItems: "center" },
  renameInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  saveBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  toggleLabel: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  footnote: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
