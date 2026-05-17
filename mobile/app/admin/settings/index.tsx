import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate, OfflineGate } from "@/components/auth/PermissionGate";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createSettingsAdminClient,
  type SettingsMasterKind,
  type SettingsSummary,
} from "@/lib/settings-admin";

type TabKey = "organization" | "masters" | "audit";

const MASTER_KINDS: { id: SettingsMasterKind; label: string }[] = [
  { id: "units", label: "Units" },
  { id: "tax-slabs", label: "Tax" },
  { id: "meal-plans", label: "Meals" },
  { id: "room-types", label: "Rooms" },
  { id: "occupancy-types", label: "Occupancy" },
  { id: "vehicle-types", label: "Vehicles" },
  { id: "pricing-attributes", label: "Attributes" },
  { id: "pricing-components", label: "Components" },
  { id: "tds-sections", label: "TDS" },
];

export default function SettingsAuditScreen() {
  return (
    <PermissionGate permission="settings.read">
      <OfflineGate policy="online_only">
        <SettingsAuditInner />
      </OfflineGate>
    </PermissionGate>
  );
}

function SettingsAuditInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createSettingsAdminClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [tab, setTab] = useState<TabKey>("organization");
  const [data, setData] = useState<SettingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState("");
  const [kind, setKind] = useState<SettingsMasterKind>("units");
  const [newRow, setNewRow] = useState({ name: "", code: "", value: "", description: "" });
  const [orgDraft, setOrgDraft] = useState<Record<string, string>>({
    name: "",
    email: "",
    phone: "",
    gstNumber: "",
    panNumber: "",
    tanNumber: "",
    invoicePrefix: "",
    nextInvoiceNumber: "1",
    billPrefix: "",
    nextBillNumber: "1",
    tdsSignatoryName: "",
    tdsSignatoryTitle: "",
  });

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const summary = await client.getSummary(auditSearch.trim() || undefined);
        setData(summary);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load settings.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [auditSearch, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.organization) return;
    const org = data.organization;
    setOrgDraft((prev) => ({
      ...prev,
      name: String(org.name ?? ""),
      email: String(org.email ?? ""),
      phone: String(org.phone ?? ""),
      gstNumber: String(org.gstNumber ?? ""),
      panNumber: String(org.panNumber ?? ""),
      tanNumber: String(org.tanNumber ?? ""),
      invoicePrefix: String(org.invoicePrefix ?? ""),
      nextInvoiceNumber: String(org.nextInvoiceNumber ?? "1"),
      billPrefix: String(org.billPrefix ?? ""),
      nextBillNumber: String(org.nextBillNumber ?? "1"),
      tdsSignatoryName: String(org.tdsSignatoryName ?? ""),
      tdsSignatoryTitle: String(org.tdsSignatoryTitle ?? ""),
    }));
  }, [data?.organization]);

  async function saveOrg() {
    setBusy("org");
    try {
      await client.updateOrganization({
        ...orgDraft,
        nextInvoiceNumber: Number.parseInt(orgDraft.nextInvoiceNumber, 10) || 1,
        nextBillNumber: Number.parseInt(orgDraft.nextBillNumber, 10) || 1,
      });
      await load("refresh");
    } catch (err) {
      Alert.alert("Save failed", err instanceof ApiError ? err.message : "Could not save organization settings.");
    } finally {
      setBusy(null);
    }
  }

  function createPayload(): Record<string, any> {
    if (kind === "units") return { name: newRow.name, abbreviation: newRow.code, description: newRow.description };
    if (kind === "tax-slabs") return { name: newRow.name, percentage: Number(newRow.value), description: newRow.description };
    if (kind === "meal-plans") return { name: newRow.name, code: newRow.code, description: newRow.description };
    if (kind === "occupancy-types") return { name: newRow.name, maxPersons: Number(newRow.value), description: newRow.description };
    if (kind === "pricing-components") {
      const firstAttr = data?.masters.pricingAttributes?.[0];
      return { pricingAttributeId: firstAttr?.id, price: Number(newRow.value), description: newRow.description };
    }
    if (kind === "tds-sections") return { sectionCode: newRow.code || newRow.name, description: newRow.description, rateWithPan: Number(newRow.value), effectiveFrom: new Date().toISOString() };
    return { name: newRow.name, description: newRow.description };
  }

  async function createMaster() {
    if (!newRow.name.trim() && !newRow.code.trim()) return;
    setBusy("master-create");
    try {
      await client.createMaster(kind, createPayload());
      setNewRow({ name: "", code: "", value: "", description: "" });
      await load("refresh");
    } catch (err) {
      Alert.alert("Create failed", err instanceof ApiError ? err.message : "Could not create setting.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(row: any) {
    if (typeof row.isActive !== "boolean") return;
    setBusy(row.id);
    try {
      await client.updateMaster(kind, row.id, { isActive: !row.isActive });
      await load("refresh");
    } catch (err) {
      Alert.alert("Update failed", err instanceof ApiError ? err.message : "Could not update setting.");
    } finally {
      setBusy(null);
    }
  }

  async function removeMaster(row: any) {
    if (kind !== "pricing-components" && kind !== "tds-sections") return;
    setBusy(row.id);
    try {
      await client.deleteMaster(kind, row.id);
      await load("refresh");
    } catch (err) {
      Alert.alert("Delete failed", err instanceof ApiError ? err.message : "Could not delete setting.");
    } finally {
      setBusy(null);
    }
  }

  const rows = data?.masters?.[kind === "pricing-attributes" ? "pricingAttributes" : kind === "tax-slabs" ? "taxSlabs" : kind === "meal-plans" ? "mealPlans" : kind === "room-types" ? "roomTypes" : kind === "occupancy-types" ? "occupancyTypes" : kind === "vehicle-types" ? "vehicleTypes" : kind === "pricing-components" ? "pricingComponents" : kind === "tds-sections" ? "tdsSections" : "units"] ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Settings", headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Organization, masters, audit</Text>
        </View>
      </View>

      <View style={styles.segmentRail}>
        {(["organization", "masters", "audit"] as TabKey[]).map((key) => (
          <Pressable
            key={key}
            testID={`settings-tab-${key}`}
            accessibilityRole="button"
            accessibilityLabel={`Show ${key}`}
            accessibilityState={{ selected: tab === key }}
            style={[styles.segment, tab === key ? styles.segmentActive : null]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.segmentText, tab === key ? styles.segmentTextActive : null]}>
              {key === "organization" ? "Org" : key === "masters" ? "Masters" : "Audit"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        testID="settings-audit-screen"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />}
      >
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {loading && !data ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : data ? (
          <>
            {tab === "organization" ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Organization and invoice</Text>
                {Object.keys(orgDraft).map((key) => (
                  <Field
                    key={key}
                    testID={`settings-org-${key}`}
                    label={labelFor(key)}
                    value={orgDraft[key] ?? ""}
                    onChangeText={(value) => setOrgDraft((prev) => ({ ...prev, [key]: value }))}
                    keyboardType={key.startsWith("next") ? "number-pad" : "default"}
                  />
                ))}
                <PrimaryButton testID="settings-org-save" label="Save settings" busy={busy === "org"} disabled={busy !== null || !orgDraft.name.trim()} onPress={() => void saveOrg()} />
              </View>
            ) : null}

            {tab === "masters" ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindRail}>
                  {MASTER_KINDS.map((option) => (
                    <Pressable
                      key={option.id}
                      testID={`settings-kind-${option.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${option.label}`}
                      accessibilityState={{ selected: kind === option.id }}
                      style={[styles.kindChip, kind === option.id ? styles.kindChipActive : null]}
                      onPress={() => setKind(option.id)}
                    >
                      <Text style={[styles.kindText, kind === option.id ? styles.kindTextActive : null]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Create {MASTER_KINDS.find((row) => row.id === kind)?.label}</Text>
                  <Field testID="settings-master-name" label={kind === "tds-sections" ? "Label" : "Name"} value={newRow.name} onChangeText={(name) => setNewRow((v) => ({ ...v, name }))} />
                  <Field testID="settings-master-code" label={kind === "units" ? "Abbreviation / code" : "Code"} value={newRow.code} onChangeText={(code) => setNewRow((v) => ({ ...v, code }))} />
                  <Field testID="settings-master-value" label={kind === "tax-slabs" ? "Percentage" : kind === "occupancy-types" ? "Max persons" : kind === "pricing-components" ? "Price" : kind === "tds-sections" ? "Rate" : "Value"} value={newRow.value} onChangeText={(value) => setNewRow((v) => ({ ...v, value }))} keyboardType="decimal-pad" />
                  <Field testID="settings-master-description" label="Description" value={newRow.description} onChangeText={(description) => setNewRow((v) => ({ ...v, description }))} />
                  <PrimaryButton testID="settings-master-create" label="Create" busy={busy === "master-create"} disabled={busy !== null} onPress={() => void createMaster()} />
                </View>
                {rows.map((row: any) => (
                  <View key={row.id} style={styles.row} testID={`settings-master-${row.id}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{row.name ?? row.sectionCode ?? row.pricingAttributeName ?? row.description ?? row.id}</Text>
                      <Text style={styles.rowMeta}>
                        {row.code || row.abbreviation || row.percentage || row.maxPersons || row.price || row.rateWithPan || "Configured"}
                      </Text>
                    </View>
                    {typeof row.isActive === "boolean" ? (
                      <Pressable
                        testID={`settings-master-toggle-${row.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={row.isActive ? "Deactivate setting" : "Activate setting"}
                        accessibilityHint="Toggles whether this master record is active"
                        disabled={busy !== null}
                        style={[styles.smallButton, busy !== null ? styles.disabled : null]}
                        onPress={() => void toggleActive(row)}
                      >
                        <Text style={styles.smallButtonText}>{row.isActive ? "Active" : "Inactive"}</Text>
                      </Pressable>
                    ) : kind === "pricing-components" || kind === "tds-sections" ? (
                      <Pressable
                        testID={`settings-master-delete-${row.id}`}
                        accessibilityRole="button"
                        accessibilityLabel="Delete setting"
                        accessibilityHint="Permanently removes this record"
                        disabled={busy !== null}
                        style={[styles.smallButton, busy !== null ? styles.disabled : null]}
                        onPress={() => void removeMaster(row)}
                      >
                        <Text style={styles.smallButtonText}>Delete</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}

            {tab === "audit" ? (
              <>
                <View style={styles.searchRow}>
                  <Ionicons name="search" size={16} color={Colors.textTertiary} />
                  <TextInput
                    testID="settings-audit-search"
                    accessibilityRole="search"
                    accessibilityLabel="Search audit logs"
                    style={styles.searchInput}
                    value={auditSearch}
                    onChangeText={setAuditSearch}
                    placeholder="Entity, action, user"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="none"
                  />
                </View>
                {data.auditLogs.map((log: any) => (
                  <View key={log.id} style={styles.row} testID={`settings-audit-${log.id}`}>
                    <Text style={styles.rowTitle}>{log.entityType} - {log.action}</Text>
                    <Text style={styles.rowMeta}>{log.userName || log.userEmail} - {formatDate(log.createdAt)}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function labelFor(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function formatDate(value?: string | null): string {
  if (!value) return "No date";
  try {
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

function Field({ label, value, onChangeText, testID, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; testID: string; keyboardType?: "default" | "number-pad" | "decimal-pad" }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={Colors.textTertiary}
      />
    </View>
  );
}

function PrimaryButton({ label, busy, disabled, onPress, testID }: { label: string; busy?: boolean; disabled?: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} style={[styles.primaryButton, disabled ? styles.disabled : null]} onPress={onPress}>
      {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={17} color="#fff" />}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  iconButton: { width: 38, height: 38, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  segmentRail: { flexDirection: "row", gap: Spacing.xs, marginHorizontal: Spacing.lg, padding: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.lg },
  segment: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: BorderRadius.md },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textInverse },
  content: { padding: Spacing.lg, gap: Spacing.md },
  centered: { paddingTop: Spacing.xxl, alignItems: "center" },
  panel: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md, gap: Spacing.md },
  panelTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  field: { gap: 6 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  input: { minHeight: 44, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderSubtle, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.md, fontSize: FontSize.sm, color: Colors.text },
  primaryButton: { minHeight: 46, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: Spacing.xs },
  primaryButtonText: { color: Colors.textInverse, fontSize: FontSize.sm, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  kindRail: { gap: Spacing.xs, paddingBottom: Spacing.xs },
  kindChip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderSubtle },
  kindChipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primaryLight },
  kindText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  kindTextActive: { color: Colors.primary },
  row: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md, flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  rowTitle: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  smallButton: { paddingHorizontal: Spacing.sm, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primaryLight },
  smallButtonText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.primary },
  searchRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },
  errorCard: { borderRadius: BorderRadius.md, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3", padding: Spacing.sm, flexDirection: "row", gap: Spacing.xs, alignItems: "center" },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
});

