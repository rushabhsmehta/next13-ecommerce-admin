import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { createOpsPortalClient, type OpsPortalInquiry } from "@/lib/ops-portal";

const STATUSES = ["pending", "contacted", "converted", "cancelled"];

function fmtDate(value?: string | null): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function toInputDate(value?: string | null): string {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
}

export default function OpsPortalDetailScreen() {
  return (
    <PermissionGate permission="opsPortal.read">
      <OpsPortalDetailInner />
    </PermissionGate>
  );
}

function OpsPortalDetailInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOpsPortalClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [data, setData] = useState<OpsPortalInquiry | null>(null);
  const [status, setStatus] = useState("pending");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [actionType, setActionType] = useState("Follow-up");
  const [actionRemarks, setActionRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await client.get(id);
        setData(res);
        setStatus(res.status || "pending");
        setNextFollowUpDate(toInputDate(res.nextFollowUpDate));
        setRemarks(res.remarks ?? "");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load assigned inquiry.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, id]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProgress() {
    if (!id) return;
    setSaving(true);
    try {
      const res = await client.update(id, {
        status,
        nextFollowUpDate: nextFollowUpDate.trim() || null,
        remarks: remarks.trim() || null,
      });
      setData(res);
      Alert.alert("Saved", "Inquiry progress was updated.");
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not update inquiry."
      );
    } finally {
      setSaving(false);
    }
  }

  async function addAction() {
    if (!id || !actionRemarks.trim()) {
      Alert.alert("Action note required", "Add a note before saving the action.");
      return;
    }
    setSaving(true);
    try {
      await client.addAction(id, {
        actionType: actionType.trim() || "Follow-up",
        remarks: actionRemarks.trim(),
      });
      setActionRemarks("");
      await load("refresh");
    } catch (err) {
      Alert.alert(
        "Action failed",
        err instanceof ApiError ? err.message : "Could not save action."
      );
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.errorTitle}>{error ?? "Inquiry not found"}</Text>
        <Pressable style={styles.retryBtn} onPress={() => void load()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: data.customerName, headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {data.customerName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {data.location?.label ?? "Assigned inquiry"}
          </Text>
        </View>
        <Pressable
          testID="ops-portal-call"
          accessibilityRole="button"
          accessibilityLabel="Call customer"
          style={styles.iconBtn}
          onPress={() => Linking.openURL(`tel:${data.customerMobileNumber}`)}
        >
          <Ionicons name="call-outline" size={20} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
        <Section title="Inquiry">
          <Info label="Mobile" value={data.customerMobileNumber} />
          <Info label="Journey" value={fmtDate(data.journeyDate)} />
          <Info label="Follow-up" value={fmtDate(data.nextFollowUpDate)} />
          <Info label="Adults" value={String(data.numAdults)} />
          <Info
            label="Children"
            value={String(
              data.numChildrenAbove11 + data.numChildren5to11 + data.numChildrenBelow5
            )}
          />
          {data.associatePartner ? (
            <Info label="Associate" value={data.associatePartner.name} />
          ) : null}
        </Section>

        <Section title="Progress">
          <View style={styles.segmentWrap}>
            {STATUSES.map((s) => {
              const active = status === s;
              return (
                <Pressable
                  key={s}
                  testID={`ops-portal-detail-status-${s}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Set inquiry status ${s}`}
                  style={[styles.segment, active ? styles.segmentActive : null]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            testID="ops-portal-next-follow-up"
            label="Next follow-up"
            value={nextFollowUpDate}
            onChangeText={setNextFollowUpDate}
            placeholder="YYYY-MM-DD"
          />
          <Field
            testID="ops-portal-remarks"
            label="Remarks"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            minHeight={84}
          />
          <Pressable
            testID="ops-portal-save-progress"
            accessibilityRole="button"
            accessibilityLabel="Save inquiry progress"
            disabled={saving}
            style={[styles.primaryBtn, saving ? styles.disabled : null]}
            onPress={() => void saveProgress()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Save progress</Text>
              </>
            )}
          </Pressable>
        </Section>

        <Section title="New action">
          <Field
            testID="ops-portal-action-type"
            label="Action type"
            value={actionType}
            onChangeText={setActionType}
          />
          <Field
            testID="ops-portal-action-remarks"
            label="Action note"
            value={actionRemarks}
            onChangeText={setActionRemarks}
            multiline
            minHeight={84}
          />
          <Pressable
            testID="ops-portal-add-action"
            accessibilityRole="button"
            accessibilityLabel="Add inquiry action"
            disabled={saving}
            style={styles.secondaryBtn}
            onPress={() => void addAction()}
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Add action</Text>
          </Pressable>
        </Section>

        <Section title="Actions">
          {data.actions.length ? (
            data.actions.map((a) => (
              <View key={a.id} style={styles.actionRow}>
                <Text style={styles.actionTitle}>{a.actionType}</Text>
                <Text style={styles.actionDate}>{fmtDate(a.actionDate)}</Text>
                <Text style={styles.actionRemarks}>{a.remarks}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No actions recorded.</Text>
          )}
        </Section>

        <Section title="Linked tour queries">
          {data.tourPackageQueries.length ? (
            data.tourPackageQueries.map((q) => (
              <Pressable
                key={q.id}
                testID={`ops-portal-query-${q.id}`}
                accessibilityRole="button"
                accessibilityLabel="Open linked tour query"
                style={styles.queryRow}
                onPress={() => router.push(`/admin/tour-queries/${q.id}` as never)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.queryTitle} numberOfLines={1}>
                    {q.tourPackageQueryName || q.tourPackageQueryNumber || "Tour query"}
                  </Text>
                  <Text style={styles.muted}>{q.isFeatured ? "Confirmed" : "Draft"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </Pressable>
            ))
          ) : (
            <Text style={styles.muted}>No tour queries linked.</Text>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  testID,
  minHeight,
  ...props
}: ComponentProps<typeof TextInput> & {
  label: string;
  testID: string;
  minHeight?: number;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        testID={testID}
        accessibilityLabel={label}
        style={[styles.input, minHeight ? { minHeight, textAlignVertical: "top" } : null]}
        placeholderTextColor={Colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  sectionBody: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.md },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "700" },
  infoValue: { flex: 1, textAlign: "right", fontSize: FontSize.sm, color: Colors.text },
  fieldWrap: { gap: 6 },
  label: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "800" },
  input: {
    minHeight: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 9,
    color: Colors.text,
    fontSize: FontSize.sm,
    backgroundColor: Colors.background,
  },
  segmentWrap: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  segment: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  segmentText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textInverse },
  primaryBtn: {
    minHeight: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  primaryBtnText: { color: "#fff", fontSize: FontSize.sm, fontWeight: "900" },
  secondaryBtn: {
    minHeight: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: "900" },
  disabled: { opacity: 0.65 },
  actionRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.sm,
    gap: 2,
  },
  actionTitle: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  actionDate: { fontSize: FontSize.xs, color: Colors.textTertiary },
  actionRemarks: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 19 },
  queryRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  queryTitle: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "900" },
  muted: { fontSize: FontSize.xs, color: Colors.textTertiary },
  errorTitle: { fontSize: FontSize.md, color: Colors.text, fontWeight: "800", textAlign: "center" },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "900" },
});
