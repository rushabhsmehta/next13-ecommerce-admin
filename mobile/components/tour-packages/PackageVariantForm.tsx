import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  AdminBottomActionBar,
  AdminDangerZone,
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { createOperationsClient } from "@/lib/operations";
import {
  createTourPackagesClient,
  type PackageVariantInput,
  type VariantHotelMappingInput,
} from "@/lib/tour-packages";

interface ItineraryDay {
  id: string;
  dayNumber: number | null;
  itineraryTitle: string | null;
}

interface Props {
  packageId: string;
  locationId: string;
  mode: "create" | "edit";
  variantId?: string;
  initial?: {
    name: string;
    description: string;
    isDefault: boolean;
    sortOrder: number;
    priceModifier: string;
    pricingCount?: number;
    hotelMappings: (VariantHotelMappingInput & { hotelName?: string })[];
  };
  itineraries: ItineraryDay[];
}

export function PackageVariantForm({
  packageId,
  locationId,
  mode,
  variantId,
  initial,
  itineraries,
}: Props) {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const pkgClient = useMemo(
    () => createTourPackagesClient(withAuth(() => getTokenRef.current())),
    []
  );
  const opsClient = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [priceModifier, setPriceModifier] = useState(initial?.priceModifier ?? "0");
  const [mappings, setMappings] = useState<Record<string, { hotelId: string; hotelName: string }>>(
    () => {
      const map: Record<string, { hotelId: string; hotelName: string }> = {};
      for (const m of initial?.hotelMappings ?? []) {
        map[m.itineraryId] = {
          hotelId: m.hotelId,
          hotelName: "hotelName" in m ? String(m.hotelName ?? "") : "",
        };
      }
      return map;
    }
  );
  const [hotels, setHotels] = useState<{ id: string; label: string }[]>([]);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadHotels = useCallback(async () => {
    try {
      const res = await opsClient.listHotels({ locationId, limit: 200 });
      setHotels(res.items.map((h) => ({ id: h.id, label: h.name })));
    } catch {
      /* ignore */
    }
  }, [opsClient, locationId]);

  useEffect(() => {
    void loadHotels();
  }, [loadHotels]);

  const screenTitle = mode === "create" ? "New variant" : "Edit variant";
  const canSubmit = name.trim().length > 0 && !submitting;
  const variantPricingQuery =
    variantId && name.trim()
      ? `packageVariantId=${encodeURIComponent(variantId)}&variantName=${encodeURIComponent(
          name.trim()
        )}`
      : variantId
        ? `packageVariantId=${encodeURIComponent(variantId)}`
        : "";
  const variantPricingPath =
    variantId && variantPricingQuery
      ? `/admin/operations/tour-packages/${packageId}/pricing?${variantPricingQuery}`
      : "";
  const newVariantPricingPath =
    variantId && variantPricingQuery
      ? `/admin/operations/tour-packages/${packageId}/pricing/new?${variantPricingQuery}`
      : "";

  function buildVariantPayload(): PackageVariantInput {
    return {
      name: name.trim(),
      description: description.trim() || null,
      isDefault,
      sortOrder: Number(sortOrder) || 0,
      priceModifier: Number(priceModifier) || 0,
    };
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      let vid = variantId;
      if (mode === "create") {
        const created = await pkgClient.createVariant(packageId, buildVariantPayload());
        vid = created.id;
      } else if (variantId) {
        await pkgClient.updateVariant(packageId, variantId, buildVariantPayload());
      }

      if (vid) {
        const mappingPayload: VariantHotelMappingInput[] = Object.entries(mappings)
          .filter(([, v]) => v.hotelId)
          .map(([itineraryId, v]) => ({ itineraryId, hotelId: v.hotelId }));
        await pkgClient.updateVariantHotelMappings(packageId, vid, mappingPayload);
      }

      router.replace(`/admin/operations/tour-packages/${packageId}/variants` as never);
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not save variant."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function deleteVariant() {
    if (!variantId) return;
    Alert.alert(
      "Delete variant",
      "This removes the package variant and its hotel mappings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              await pkgClient.deleteVariant(packageId, variantId);
              router.replace(`/admin/operations/tour-packages/${packageId}/variants` as never);
            } catch (err) {
              Alert.alert(
                "Delete failed",
                err instanceof ApiError ? err.message : "Could not delete variant."
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "variant-new-screen" : "variant-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create variant" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="variant-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !name.trim() ? "Enter a variant name." : submitting ? "Saving…" : undefined
          }
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: screenTitle, headerShown: false }} />
      <AdminTopBar
        title={screenTitle}
        subtitle="Package variant"
        onBackPress={() => router.back()}
        testID="variant-form-header"
      />

      <AdminFormSection title="Basics" testID="variant-form-basics">
        <AdminFormField label="Variant name" required>
          <TextInput
            testID="variant-form-name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Deluxe, Budget"
            placeholderTextColor={Colors.textTertiary}
          />
        </AdminFormField>
        <AdminFormField label="Description">
          <TextInput
            testID="variant-form-description"
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
        </AdminFormField>
        <AdminFormField label="Sort order">
          <TextInput
            testID="variant-form-sort"
            style={styles.input}
            value={sortOrder}
            onChangeText={setSortOrder}
            keyboardType="number-pad"
          />
        </AdminFormField>
        <AdminFormField label="Price modifier (INR)">
          <TextInput
            testID="variant-form-modifier"
            style={styles.input}
            value={priceModifier}
            onChangeText={setPriceModifier}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
          />
        </AdminFormField>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Default variant</Text>
          <Switch
            testID="variant-form-default"
            value={isDefault}
            onValueChange={setIsDefault}
          />
        </View>
      </AdminFormSection>

      <AdminFormSection title="Hotel per day" testID="variant-form-hotels">
        {itineraries.length === 0 ? (
          <Text style={styles.hint}>Add itinerary days to the package first.</Text>
        ) : (
          itineraries.map((day) => {
            const selected = mappings[day.id];
            const label =
              selected?.hotelName ||
              hotels.find((h) => h.id === selected?.hotelId)?.label ||
              "Choose hotel";
            return (
              <AdminFormField
                key={day.id}
                label={`Day ${day.dayNumber ?? "—"} — ${day.itineraryTitle ?? "Untitled"}`}
              >
                <Pressable
                  testID={`variant-form-hotel-day-${day.dayNumber}`}
                  accessibilityRole="button"
                  style={styles.pickerBtn}
                  onPress={() => setPickerDayId(day.id)}
                >
                  <Text
                    style={selected?.hotelId ? styles.pickerValue : styles.pickerPlaceholder}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
                </Pressable>
              </AdminFormField>
            );
          })
        )}
      </AdminFormSection>

      {mode === "edit" && variantId ? (
        <AdminFormSection
          title="Seasonal pricing"
          description="Manage date-bound pricing periods and component rates for this variant."
          testID="variant-form-pricing"
        >
          <Pressable
            testID="variant-form-manage-pricing"
            accessibilityRole="button"
            accessibilityLabel="Manage variant seasonal pricing"
            style={styles.actionBtn}
            onPress={() => router.push(variantPricingPath as never)}
          >
            <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
            <View style={styles.actionTextBlock}>
              <Text style={styles.actionTitle}>Manage pricing</Text>
              <Text style={styles.actionSub}>
                {initial?.pricingCount ?? 0} variant pricing row(s)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </Pressable>
          <Pressable
            testID="variant-form-new-pricing"
            accessibilityRole="button"
            accessibilityLabel="Add variant pricing period"
            style={styles.actionBtn}
            onPress={() => router.push(newVariantPricingPath as never)}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <View style={styles.actionTextBlock}>
              <Text style={styles.actionTitle}>New pricing period</Text>
              <Text style={styles.actionSub}>Variant is preselected.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormSection>
      ) : null}

      {mode === "edit" && variantId ? (
        <AdminDangerZone
          testID="variant-danger-zone"
          actions={[
            {
              id: "delete-variant",
              label: "Delete variant",
              hint: "Permanently removes this package variant",
              onPress: deleteVariant,
              disabled: submitting,
              testID: "variant-delete-btn",
            },
          ]}
        />
      ) : null}

      <AdminPickerSheet
        visible={pickerDayId !== null}
        title="Hotel"
        options={hotels}
        selectedId={pickerDayId ? mappings[pickerDayId]?.hotelId ?? null : null}
        onSelect={(opt) => {
          if (pickerDayId) {
            setMappings((prev) => ({
              ...prev,
              [pickerDayId]: { hotelId: opt.id, hotelName: opt.label },
            }));
          }
          setPickerDayId(null);
        }}
        onClose={() => setPickerDayId(null)}
        testID="variant-hotel-picker"
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  textarea: { minHeight: 72, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.md, color: Colors.text },
  hint: { fontSize: FontSize.sm, color: Colors.textTertiary },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  pickerValue: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textTertiary },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  actionTextBlock: { flex: 1, gap: 2 },
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  actionSub: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
  },
});
