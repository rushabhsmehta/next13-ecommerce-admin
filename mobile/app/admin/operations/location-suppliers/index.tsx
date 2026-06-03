import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminEmptyState,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createOperationsClient,
  type SupplierLocationRelation,
} from "@/lib/operations";
import { LookupPickerModal } from "@/components/inquiry/LookupPickerModal";
import type { InquiryLookupOption } from "@/lib/inquiry-lookups";

export default function LocationSuppliersScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const [items, setItems] = useState<SupplierLocationRelation[]>([]);
  const [locations, setLocations] = useState<InquiryLookupOption[]>([]);
  const [suppliers, setSuppliers] = useState<InquiryLookupOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierLabel, setSupplierLabel] = useState("");
  const [picker, setPicker] = useState<"location" | "supplier" | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      try {
        const [relations, locs, sups] = await Promise.all([
          client.listLocationSuppliers("location"),
          request<{ items: { id: string; name: string }[] }>(
            "/api/mobile/operations/list?type=locations&limit=100"
          ),
          client.listSuppliers({ limit: 100 }),
        ]);
        setItems(relations.items);
        setLocations(locs.items.map((l) => ({ id: l.id, label: l.name })));
        setSuppliers(sups.suppliers.map((s) => ({ id: s.id, label: s.name })));
      } catch (err) {
        Alert.alert(
          "Load failed",
          err instanceof ApiError ? err.message : "Could not load relationships."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, request]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function addRelation() {
    if (!locationId || !supplierId) return;
    setSaving(true);
    try {
      await client.createLocationSupplier({ locationId, supplierId });
      setLocationId("");
      setLocationLabel("");
      setSupplierId("");
      setSupplierLabel("");
      await load("refresh");
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not link supplier."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRelation(id: string) {
    try {
      await client.deleteLocationSupplier(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not remove relationship."
      );
    }
  }

  const subtitle = loading ? "Loading..." : `${items.length} links`;

  return (
    <AdminScreen scroll={false} testID="location-suppliers-screen">
      <Stack.Screen options={{ title: "Location suppliers", headerShown: false }} />

      <AdminTopBar
        title="Location suppliers"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID="location-suppliers-header"
      />

      <View style={styles.formCard}>
        <Pressable
          testID="location-supplier-location"
          accessibilityRole="button"
          accessibilityLabel="Choose location"
          style={styles.pickerBtn}
          onPress={() => setPicker("location")}
        >
          <Text style={locationId ? styles.pickerValue : styles.pickerPlaceholder}>
            {locationLabel || "Select location"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
        </Pressable>
        <Pressable
          testID="location-supplier-supplier"
          accessibilityRole="button"
          accessibilityLabel="Choose supplier"
          style={styles.pickerBtn}
          onPress={() => setPicker("supplier")}
        >
          <Text style={supplierId ? styles.pickerValue : styles.pickerPlaceholder}>
            {supplierLabel || "Select supplier"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
        </Pressable>
        <Pressable
          testID="location-supplier-add"
          accessibilityRole="button"
          accessibilityLabel="Link supplier to location"
          disabled={!locationId || !supplierId || saving}
          style={[styles.addBtn, (!locationId || !supplierId || saving) ? styles.disabled : null]}
          onPress={addRelation}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addBtnText}>Link supplier</Text>
          )}
        </Pressable>
      </View>

      <FlatList
        style={styles.list}
        testID="location-supplier-list"
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.listLoader} color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="link-outline"
              title="No links yet."
              testID="location-suppliers-empty"
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.locationLabel || "Location"}</Text>
              <Text style={styles.rowSub}>{item.supplierName || "Supplier"}</Text>
            </View>
            <Pressable
              testID={`location-supplier-delete-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel="Remove link"
              style={styles.deleteBtn}
              onPress={() =>
                Alert.alert("Remove link?", "This removes the location-supplier relationship.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Remove", style: "destructive", onPress: () => void deleteRelation(item.id) },
                ])
              }
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </Pressable>
          </View>
        )}
      />

      <LookupPickerModal
        visible={!!picker}
        title={picker === "location" ? "Location" : "Supplier"}
        options={picker === "location" ? locations : suppliers}
        testID="location-supplier-picker"
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          if (picker === "location") {
            const opt = locations.find((o) => o.id === id);
            setLocationId(id);
            setLocationLabel(opt?.label ?? "");
          } else {
            const opt = suppliers.find((o) => o.id === id);
            setSupplierId(id);
            setSupplierLabel(opt?.label ?? "");
          }
        }}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xl },
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  formCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pickerValue: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textTertiary },
  addBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.sm },
  disabled: { opacity: 0.5 },
  centered: { paddingTop: Spacing.xl, alignItems: "center" },
  empty: { textAlign: "center", color: Colors.textSecondary, marginTop: Spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  rowTitle: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  rowSub: { marginTop: 3, fontSize: FontSize.sm, color: Colors.textSecondary },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1f2",
  },
});
