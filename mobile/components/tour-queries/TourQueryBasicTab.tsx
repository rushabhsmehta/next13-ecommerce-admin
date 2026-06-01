import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminFormSection } from "@/components/admin";
import { Colors } from "@/constants/theme";
import { FormField } from "./FormField";
import { tourQueryFormStyles as styles } from "./form-styles";
import type { TourQueryEditFormState } from "./useTourQueryEditForm";

type Props = Pick<
  TourQueryEditFormState,
  | "name"
  | "setName"
  | "remarks"
  | "setRemarks"
  | "packagesList"
  | "queriesList"
  | "packageVariants"
  | "selectedPackageId"
  | "selectedVariantIds"
  | "setSelectedVariantIds"
  | "selectedCopyQueryId"
  | "setActivePicker"
  | "setSaving"
  | "authRequest"
  | "setItineraries"
  | "loadHotelsForLocation"
  | "saving"
>;

export function TourQueryBasicTab({
  name,
  setName,
  remarks,
  setRemarks,
  packagesList,
  queriesList,
  packageVariants,
  selectedPackageId,
  selectedVariantIds,
  setSelectedVariantIds,
  selectedCopyQueryId,
  setActivePicker,
  setSaving,
  authRequest,
  setItineraries,
  loadHotelsForLocation,
  saving,
}: Props) {
  return (
    <>
      <AdminFormSection title="Basics" testID="tq-edit-section-basics">
        <FormField
          label="Tour package query name"
          value={name}
          onChange={setName}
          testID="tq-edit-name"
        />
      </AdminFormSection>

      <AdminFormSection title="Template & Source" testID="tq-edit-section-template">
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Load from Tour Package Template</Text>
          <Pressable
            testID="tq-edit-template-picker"
            accessibilityRole="button"
            accessibilityLabel="Choose package template"
            style={styles.pickerBtn}
            onPress={() => setActivePicker({ type: "packageTemplate", dayIndex: -1 })}
          >
            <Text style={styles.pickerBtnText} numberOfLines={2}>
              {packagesList.find((p) => p.id === selectedPackageId)?.name ??
                "Select package template..."}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Select variants to compare (2 or more)</Text>
          {!selectedPackageId ? (
            <Text style={styles.help}>
              Choose a tour package template above first. Inquiry-only queries do not have
              variants until you link a package.
            </Text>
          ) : packageVariants.length === 0 ? (
            <Text style={styles.help}>
              This package has no variants on the server. Add variants in the web admin, then
              pull to refresh here.
            </Text>
          ) : (
            <>
              <Text style={styles.help}>
                Tick two or more options, then save. Use the Variants tab to compare pricing
                after save.
              </Text>
              <View style={styles.variantsContainer}>
                {packageVariants.map((v) => {
                  const isChecked = selectedVariantIds.includes(v.id);
                  return (
                    <View key={v.id} style={styles.variantRow}>
                      <Pressable
                        testID={`variant-toggle-${v.id}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isChecked }}
                        style={styles.variantCheckboxContainer}
                        onPress={() => {
                          setSelectedVariantIds((prev) =>
                            prev.includes(v.id)
                              ? prev.filter((vid) => vid !== v.id)
                              : [...prev, v.id]
                          );
                        }}
                      >
                        <Ionicons
                          name={isChecked ? "checkbox" : "square-outline"}
                          size={20}
                          color={isChecked ? Colors.primary : Colors.textTertiary}
                        />
                        <Text style={styles.variantLabel} numberOfLines={1}>
                          {v.name}
                        </Text>
                      </Pressable>
                      {isChecked && selectedPackageId ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Apply hotels from ${v.name}`}
                          style={styles.applyHotelsBtn}
                          disabled={saving}
                          onPress={async () => {
                            setSaving(true);
                            try {
                              const res = await authRequest<{ mappings: { dayNumber: number; hotelId: string }[] }>(
                                `/api/mobile/tour-packages/${encodeURIComponent(selectedPackageId)}/variants/${encodeURIComponent(v.id)}/hotel-mappings`
                              );
                              setItineraries((prev) => {
                                const copy = [...prev];
                                for (const mapping of res.mappings || []) {
                                  const dIdx = copy.findIndex(
                                    (d) => d.dayNumber === mapping.dayNumber
                                  );
                                  if (dIdx !== -1) {
                                    copy[dIdx] = { ...copy[dIdx], hotelId: mapping.hotelId };
                                    if (copy[dIdx].locationId) {
                                      void loadHotelsForLocation(copy[dIdx].locationId!);
                                    }
                                  }
                                }
                                return copy;
                              });
                              Alert.alert(
                                "Success",
                                `Applied hotel mappings from "${v.name}" to itineraries.`
                              );
                            } catch {
                              Alert.alert("Error", "Could not load variant hotel mappings.");
                            } finally {
                              setSaving(false);
                            }
                          }}
                        >
                          <Text style={styles.applyHotelsBtnText}>Apply hotels</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Copy from Another Query</Text>
          <Pressable
            testID="tq-edit-copy-query-picker"
            accessibilityRole="button"
            accessibilityLabel="Choose query to copy"
            style={styles.pickerBtn}
            onPress={() => setActivePicker({ type: "copyQuery", dayIndex: -1 })}
          >
            <Text style={styles.pickerBtnText} numberOfLines={2}>
              {queriesList.find((q) => q.id === selectedCopyQueryId)?.name ??
                "Select query to copy..."}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </AdminFormSection>

      <AdminFormSection title="Remarks" testID="tq-edit-section-remarks">
        <FormField label="Remarks" value={remarks} onChange={setRemarks} multiline />
      </AdminFormSection>
    </>
  );
}
