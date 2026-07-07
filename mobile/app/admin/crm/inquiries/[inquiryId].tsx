import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import {
  createAssociateInquiryClient,
  getLocationOptions,
  type InquiryActionItem,
  type LocationOption,
} from "@/lib/associate-inquiries";
import {
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
  type InquiryStatus,
} from "@/lib/inquiry-statuses";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { createTourQueryCreateClient } from "@/lib/tour-query-create";
import type { CrmInquiryTourPackageQuerySummary } from "@/lib/crm-inquiries-list";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  AdminErrorState,
  AdminFormField,
  AdminFormSection,
  AdminLoadingState,
  AdminPickerSheet,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
} from "@/components/admin";
import { DateField } from "@/components/ui/DateField";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

const STATUS_SEGMENT_OPTIONS = INQUIRY_STATUSES.map((st) => ({
  id: st,
  label: INQUIRY_STATUS_LABELS[st],
}));

function queryLabel(q: CrmInquiryTourPackageQuerySummary): string {
  return (
    q.tourPackageQueryName?.trim() ||
    q.tourPackageQueryNumber?.trim() ||
    `Query ${q.id.slice(0, 8)}`
  );
}

interface AdminInquiryDetail {
  id: string;
  customerName: string;
  customerMobileNumber: string;
  locationId: string;
  status: string;
  journeyDate: string | null;
  nextFollowUpDate: string | null;
  remarks: string | null;
  numAdults: number;
  numChildrenAbove11: number;
  numChildren5to11: number;
  numChildrenBelow5: number;
  associatePartnerId: string | null;
  location?: { id: string; label: string } | null;
  associatePartner?: { id: string; name: string } | null;
  assignedStaff?: { id: string; name: string; email?: string | null } | null;
  actions?: InquiryActionItem[];
  tourPackageQueries?: CrmInquiryTourPackageQuerySummary[] | null;
  couponRedemptions?: {
    id: string;
    code: string;
    status: string;
    discountAmount: number | null;
    taxableAmountAfterDiscount: number | null;
    validationMessage: string | null;
    campaign?: { name: string } | null;
  }[];
}

interface StaffRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

const ACTION_TYPES = ["FOLLOW_UP", "CALL", "NOTE", "MEETING"] as const;

function formatCouponAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `INR ${Math.round(Number(value)).toLocaleString("en-IN")}`;
}

export default function AdminInquiryDetailRoute() {
  return (
    <PermissionGate permission="crm.read">
      <AdminInquiryDetailInner />
    </PermissionGate>
  );
}

function AdminInquiryDetailInner() {
  const { inquiryId } = useLocalSearchParams<{ inquiryId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("crm.write");

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );
  const client = useMemo(
    () => createAssociateInquiryClient(authRequest),
    [authRequest]
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<AdminInquiryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [remarks, setRemarks] = useState("");
  const [numAdults, setNumAdults] = useState("2");
  const [numChildren5to11, setNumChildren5to11] = useState("0");
  const [statusDraft, setStatusDraft] = useState("PENDING");

  const [actionType, setActionType] =
    useState<(typeof ACTION_TYPES)[number]>("FOLLOW_UP");
  const [actionRemarks, setActionRemarks] = useState("");

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const load = useCallback(async () => {
    if (!inquiryId) return;
    setError(null);
    setLoading(true);
    try {
      const data = await authRequest<AdminInquiryDetail>(
        `/api/inquiries/${encodeURIComponent(inquiryId)}`
      );
      setDetail(data);
      setCustomerName(data.customerName ?? "");
      setCustomerMobile(data.customerMobileNumber ?? "");
      setJourneyDate(data.journeyDate ? data.journeyDate.slice(0, 10) : "");
      setNextFollowUp(
        data.nextFollowUpDate ? data.nextFollowUpDate.slice(0, 10) : ""
      );
      setRemarks(data.remarks ?? "");
      setNumAdults(String(data.numAdults ?? 2));
      setNumChildren5to11(String(data.numChildren5to11 ?? 0));
      setStatusDraft((data.status ?? "PENDING").toUpperCase());
      setLocationId(data.locationId ?? "");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not load inquiry.";
      setError(message);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [authRequest, inquiryId]);

  const refresh = useCallback(async () => {
    if (!inquiryId) return;
    setRefreshing(true);
    setError(null);
    try {
      const data = await authRequest<AdminInquiryDetail>(
        `/api/inquiries/${encodeURIComponent(inquiryId)}`
      );
      setDetail(data);
      setCustomerName(data.customerName ?? "");
      setCustomerMobile(data.customerMobileNumber ?? "");
      setJourneyDate(data.journeyDate ? data.journeyDate.slice(0, 10) : "");
      setNextFollowUp(
        data.nextFollowUpDate ? data.nextFollowUpDate.slice(0, 10) : ""
      );
      setRemarks(data.remarks ?? "");
      setNumAdults(String(data.numAdults ?? 2));
      setNumChildren5to11(String(data.numChildren5to11 ?? 0));
      setStatusDraft((data.status ?? "PENDING").toUpperCase());
      setLocationId(data.locationId ?? "");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not refresh inquiry.";
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [authRequest, inquiryId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canWrite) return;
    void (async () => {
      try {
        const opts = await getLocationOptions(authRequest);
        setLocations(opts);
      } catch {
        setLocations([]);
      }
    })();
  }, [authRequest, canWrite]);

  async function openStaffPicker() {
    if (!canWrite || !inquiryId) return;
    setStaffPickerOpen(true);
    setStaffLoading(true);
    try {
      const rows = await authRequest<StaffRow[]>(
        "/api/operational-staff?activeOnly=true"
      );
      setStaffList(Array.isArray(rows) ? rows : []);
    } catch {
      setStaffList([]);
      Alert.alert(
        "Staff list",
        "Could not load operational staff. Ensure you are signed in as an organization member."
      );
    } finally {
      setStaffLoading(false);
    }
  }

  async function assignStaff(staffId: string) {
    if (!inquiryId) return;
    setSaving(true);
    try {
      await authRequest(
        `/api/inquiries/${encodeURIComponent(inquiryId)}/assign-staff`,
        { method: "PATCH", body: { staffId } }
      );
      await refresh();
      setStaffPickerOpen(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Assign failed.";
      Alert.alert("Assign failed", message);
    } finally {
      setSaving(false);
    }
  }

  async function unassignStaff() {
    if (!inquiryId) return;
    Alert.alert(
      "Unassign staff",
      "Remove the operational staff assignment for this inquiry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unassign",
          onPress: async () => {
            setSaving(true);
            try {
              await authRequest(
                `/api/inquiries/${encodeURIComponent(inquiryId)}/unassign-staff`,
                { method: "PATCH", body: {} }
              );
              setDetail((prev) =>
                prev ? { ...prev, assignedStaff: null } : prev
              );
              await refresh();
            } catch (err) {
              const message =
                err instanceof ApiError ? err.message : "Unassign failed.";
              Alert.alert("Unassign failed", message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  async function patchStatus(status: InquiryStatus) {
    if (!inquiryId || !canWrite) return;
    setSaving(true);
    try {
      const updated = await client.updateStatus(inquiryId, status);
      setStatusDraft((updated.status ?? status).toUpperCase());
      setDetail((prev) => (prev ? { ...prev, status: updated.status } : prev));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Status update failed.";
      Alert.alert("Status", message);
    } finally {
      setSaving(false);
    }
  }

  async function saveFollowUpOnly() {
    if (!inquiryId || !canWrite) return;
    setSaving(true);
    try {
      const body =
        nextFollowUp.trim() === ""
          ? { nextFollowUpDate: null }
          : { nextFollowUpDate: nextFollowUp.trim() };
      const updated = await authRequest<AdminInquiryDetail>(
        `/api/inquiries/${encodeURIComponent(inquiryId)}`,
        { method: "PATCH", body }
      );
      setDetail(updated);
      setNextFollowUp(
        updated.nextFollowUpDate
          ? updated.nextFollowUpDate.slice(0, 10)
          : ""
      );
      Alert.alert("Saved", "Follow-up date updated.");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not save follow-up.";
      Alert.alert("Follow-up", message);
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    if (!inquiryId || !detail || !canWrite) return;
    setSaving(true);
    try {
      const na = Math.max(0, parseInt(numAdults, 10) || 0);
      const nc = Math.max(0, parseInt(numChildren5to11, 10) || 0);
      const updated = await authRequest<AdminInquiryDetail>(
        `/api/inquiries/${encodeURIComponent(inquiryId)}`,
        {
          method: "PATCH",
          body: {
            customerName: customerName.trim(),
            customerMobileNumber: customerMobile.trim(),
            locationId: locationId || detail.locationId,
            associatePartnerId: detail.associatePartnerId,
            numAdults: na,
            numChildrenAbove11: detail.numChildrenAbove11,
            numChildren5to11: nc,
            numChildrenBelow5: detail.numChildrenBelow5,
            status: (INQUIRY_STATUSES as readonly string[]).includes(
              statusDraft.toUpperCase()
            )
              ? statusDraft.toUpperCase()
              : "PENDING",
            journeyDate: journeyDate.trim() || null,
            nextFollowUpDate: nextFollowUp.trim() || null,
            remarks: remarks.trim() || null,
          },
        }
      );
      setDetail(updated);
      Alert.alert("Saved", "Inquiry updated.");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Update failed.";
      Alert.alert("Update failed", message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTourQuery() {
    if (!inquiryId || !canWrite) return;
    const existingCount = detail?.tourPackageQueries?.length ?? 0;
    const shortInquiryId = inquiryId.slice(0, 8);
    const sourceSummary = [
      detail?.customerName || "this inquiry",
      detail?.customerMobileNumber ? `Mobile: ${detail.customerMobileNumber}` : null,
      detail?.journeyDate ? `Journey: ${detail.journeyDate}` : null,
      detail?.location?.label || detail?.locationId
        ? `Location: ${detail?.location?.label || detail?.locationId}`
        : null,
      `Inquiry: ${shortInquiryId}`,
    ]
      .filter(Boolean)
      .join("\n");
    const title = existingCount > 0 ? "Create another tour query?" : "Create tour query";
    const message =
      existingCount > 0
        ? `This inquiry already has ${existingCount} linked tour quer${existingCount === 1 ? "y" : "ies"}. Create another one anyway?\n\n${sourceSummary}`
        : `Create a new Tour Package Query against this inquiry?\n\n${sourceSummary}`;

    Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: async () => {
            setSaving(true);
            try {
              const queryClient = createTourQueryCreateClient(authRequest);
              const result = await queryClient.fromInquiry(inquiryId);
              if (result.inquiryId !== inquiryId) {
                throw new Error(
                  "The query was created, but it was not linked to this inquiry. Please refresh and verify before using it."
                );
              }
              await refresh();
              Alert.alert(
                "Created against inquiry",
                `Tour Query ${result.tourPackageQueryNumber || result.id} created for ${detail?.customerName || "this inquiry"}.`,
                [
                  {
                    text: "Open Query",
                    onPress: () => {
                      router.push(`/admin/tour-queries/${result.id}` as never);
                    },
                  },
                  {
                    text: "Dismiss",
                  },
                ]
              );
            } catch (err) {
              const message =
                err instanceof ApiError ? err.message : "Could not create tour query.";
              Alert.alert("Create Tour Query failed", message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  async function addNote() {
    if (!inquiryId || !canWrite || !actionRemarks.trim()) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await client.addAction(inquiryId, {
        actionType,
        remarks: actionRemarks.trim(),
        actionDate: today,
      });
      setActionRemarks("");
      await refresh();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not add note.";
      Alert.alert("Note", message);
    } finally {
      setSaving(false);
    }
  }

  async function removeAction(actionId: string) {
    if (!inquiryId || !canWrite) return;
    Alert.alert("Delete note", "Remove this activity from the timeline?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await client.deleteAction(inquiryId, actionId);
            await refresh();
          } catch (err) {
            const message =
              err instanceof ApiError ? err.message : "Delete failed.";
            Alert.alert("Delete failed", message);
          }
        },
      },
    ]);
  }

  const locationOptions = useMemo(
    () => locations.map((l) => ({ id: l.id, label: l.label })),
    [locations]
  );

  const staffOptions = useMemo(
    () => staffList.map((s) => ({ id: s.id, label: s.name, subtitle: s.email })),
    [staffList]
  );

  const selectedLocationLabel =
    locations.find((l) => l.id === locationId)?.label ??
    detail?.location?.label ??
    "Select location";

  if (loading && !detail) {
    return <AdminLoadingState label="Loading inquiry…" testID="inquiry-detail-loading" />;
  }

  if (error && !detail) {
    return (
      <AdminScreen testID="inquiry-detail-error">
        <Stack.Screen options={{ headerShown: false }} />
        <AdminErrorState message={error} onRetry={() => void load()} testID="inquiry-detail-error-state" />
        <Pressable
          testID="inquiry-detail-back"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.secondaryBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryBtnText}>Back</Text>
        </Pressable>
      </AdminScreen>
    );
  }

  if (!detail) return null;
  const latestCoupon = detail.couponRedemptions?.[0] ?? null;

  return (
    <AdminScreen
      testID="inquiry-detail-screen"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          tintColor={Colors.primary}
        />
      }
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <AdminTopBar
        title={detail.customerName}
        subtitle={detail.customerMobileNumber}
        onBackPress={() => router.back()}
        testID="inquiry-detail-header"
      />

      {error ? <AdminErrorState message={error} onRetry={() => void refresh()} testID="inquiry-detail-banner-error" /> : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Location</Text>
          <Text style={styles.cardValue}>
            {detail.location?.label ?? "—"}
          </Text>
          {detail.associatePartner ? (
            <>
              <Text style={[styles.cardLabel, { marginTop: 8 }]}>Associate</Text>
              <Text style={styles.cardValue}>{detail.associatePartner.name}</Text>
            </>
          ) : null}
          {detail.assignedStaff ? (
            <>
              <Text style={[styles.cardLabel, { marginTop: 8 }]}>Assigned to</Text>
              <Text style={styles.cardValue}>{detail.assignedStaff.name}</Text>
            </>
          ) : (
            <Text style={[styles.muted, { marginTop: 8 }]}>No staff assigned</Text>
          )}
        </View>

        {latestCoupon ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Coupon</Text>
            <View style={styles.couponHead}>
              <Text style={styles.couponCode}>{latestCoupon.code}</Text>
              <Text style={styles.couponStatus}>{latestCoupon.status.replace(/_/g, " ")}</Text>
            </View>
            <Text style={styles.cardValue}>
              {latestCoupon.campaign?.name || "Coupon campaign"}
            </Text>
            <Text style={styles.muted}>
              Discount {formatCouponAmount(latestCoupon.discountAmount)}
              {latestCoupon.taxableAmountAfterDiscount !== null &&
              latestCoupon.taxableAmountAfterDiscount !== undefined
                ? `; taxable ${formatCouponAmount(latestCoupon.taxableAmountAfterDiscount)}`
                : ""}
            </Text>
            {latestCoupon.validationMessage ? (
              <Text style={styles.bannerText}>{latestCoupon.validationMessage}</Text>
            ) : null}
          </View>
        ) : null}

        {(detail.tourPackageQueries && detail.tourPackageQueries.length > 0) || canWrite ? (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Tour queries</Text>
            {detail.tourPackageQueries && detail.tourPackageQueries.length > 0 ? (
              detail.tourPackageQueries.map((q) => (
                <Pressable
                  key={q.id}
                  testID={`inquiry-open-query-${q.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open tour query ${queryLabel(q)}`}
                  style={styles.linkRow}
                  onPress={() =>
                    router.push(`/admin/tour-queries/${q.id}` as never)
                  }
                >
                  <View style={styles.linkRowText}>
                    <Text style={styles.linkText}>{queryLabel(q)}</Text>
                    {q.tourPackageQueryType ? (
                      <Text style={styles.muted}>{q.tourPackageQueryType}</Text>
                    ) : null}
                  </View>
                  {q.isFeatured ? (
                    <View style={styles.confirmedPill}>
                      <Text style={styles.confirmedPillText}>Confirmed</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                </Pressable>
              ))
            ) : (
              <Text style={[styles.muted, { marginBottom: Spacing.sm }]}>No linked tour queries yet.</Text>
            )}

            {canWrite ? (
              <>
                <Pressable
                  testID="inquiry-smart-build"
                  accessibilityRole="button"
                  accessibilityLabel="Smart build tour query from inquiry"
                  accessibilityHint="Opens package template, rooms, transport, and pricing wizard."
                  style={[
                    styles.primaryBtn,
                    { marginTop: Spacing.sm, backgroundColor: Colors.primaryDark },
                    saving ? styles.btnDisabled : null,
                  ]}
                  disabled={saving}
                  onPress={() =>
                    router.push(
                      `/admin/tour-queries/smart-build?inquiryId=${inquiryId}` as never
                    )
                  }
                >
                  <Ionicons name="sparkles-outline" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Smart Build</Text>
                </Pressable>
                <Pressable
                  testID="inquiry-create-tour-query"
                  accessibilityRole="button"
                  accessibilityLabel="Create tour query from this inquiry"
                  style={[
                    styles.primaryBtn,
                    { marginTop: Spacing.sm, backgroundColor: Colors.primary },
                    saving ? styles.btnDisabled : null,
                  ]}
                  disabled={saving}
                  onPress={() => void handleCreateTourQuery()}
                >
                  <Ionicons name="map-outline" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {saving ? "Processing…" : "Create Tour Query"}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}

      <AdminFormSection title="Status" testID="inquiry-detail-status">
        <AdminSegmentedControl
          options={STATUS_SEGMENT_OPTIONS}
          value={
            (INQUIRY_STATUSES as readonly string[]).includes(statusDraft)
              ? (statusDraft as InquiryStatus)
              : "PENDING"
          }
          onChange={(st) => {
            if (canWrite && !saving) void patchStatus(st);
          }}
          testIDPrefix="inquiry-status"
        />
      </AdminFormSection>

        {canWrite ? (
          <>
            <AdminFormSection title="Operational staff" testID="inquiry-detail-staff">
            <View style={styles.rowGap}>
              <Pressable
                testID="inquiry-assign-staff"
                accessibilityRole="button"
                accessibilityLabel="Assign operational staff"
                style={styles.primaryBtn}
                onPress={() => void openStaffPicker()}
              >
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Assign staff</Text>
              </Pressable>
              {detail.assignedStaff ? (
                <Pressable
                  testID="inquiry-unassign-staff"
                  accessibilityRole="button"
                  accessibilityLabel="Unassign operational staff"
                  style={styles.secondaryBtn}
                  onPress={() => void unassignStaff()}
                >
                  <Text style={styles.secondaryBtnText}>Unassign</Text>
                </Pressable>
              ) : null}
            </View>
            </AdminFormSection>

            <AdminFormSection title="Follow-up" testID="inquiry-detail-follow-up">
            <AdminFormField label="Next follow-up" hint="Leave empty to clear.">
            <DateField
              testID="inquiry-follow-up-input"
              accessibilityLabel="Next follow-up date"
              style={styles.input}
              value={nextFollowUp}
              onChange={setNextFollowUp}
              placeholder="Choose follow-up date"
            />
            <Pressable
              testID="inquiry-save-follow-up"
              accessibilityRole="button"
              accessibilityLabel="Save follow-up date"
              style={[styles.primaryBtn, saving ? styles.btnDisabled : null]}
              disabled={saving}
              onPress={() => void saveFollowUpOnly()}
            >
              <Text style={styles.primaryBtnText}>Save follow-up</Text>
            </Pressable>
            </AdminFormField>
            </AdminFormSection>

            <AdminFormSection title="Edit inquiry" testID="inquiry-detail-edit">
            <AdminFormField label="Customer name">
            <TextInput
              testID="inquiry-edit-name"
              accessibilityLabel="Customer name"
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
            />
            </AdminFormField>
            <AdminFormField label="Mobile">
            <TextInput
              testID="inquiry-edit-phone"
              accessibilityLabel="Customer mobile number"
              style={styles.input}
              value={customerMobile}
              onChangeText={setCustomerMobile}
              keyboardType="phone-pad"
            />
            </AdminFormField>
            <AdminFormField label="Location">
            <Pressable
              testID="inquiry-location-picker"
              accessibilityRole="button"
              accessibilityLabel="Choose location"
              style={styles.pickerBtn}
              onPress={() => setLocationPickerOpen(true)}
            >
              <Text style={styles.pickerBtnText} numberOfLines={2}>
                {selectedLocationLabel}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </Pressable>
            </AdminFormField>
            <AdminFormField label="Journey date">
            <DateField
              testID="inquiry-edit-journey"
              accessibilityLabel="Journey date"
              style={styles.input}
              value={journeyDate}
              onChange={setJourneyDate}
              placeholder="Choose journey date"
            />
            </AdminFormField>
            <AdminFormField label="Adults / Children 5–11">
            <View style={styles.inlineInputs}>
              <TextInput
                testID="inquiry-edit-adults"
                accessibilityLabel="Number of adults"
                style={[styles.input, styles.inputHalf]}
                value={numAdults}
                onChangeText={setNumAdults}
                keyboardType="number-pad"
              />
              <TextInput
                testID="inquiry-edit-children"
                accessibilityLabel="Number of children 5 to 11"
                style={[styles.input, styles.inputHalf]}
                value={numChildren5to11}
                onChangeText={setNumChildren5to11}
                keyboardType="number-pad"
              />
            </View>
            </AdminFormField>
            <AdminFormField label="Remarks">
            <TextInput
              testID="inquiry-edit-remarks"
              accessibilityLabel="Remarks"
              style={[styles.input, styles.textArea]}
              value={remarks}
              onChangeText={setRemarks}
              multiline
            />
            </AdminFormField>
            <Pressable
              testID="inquiry-save-profile"
              accessibilityRole="button"
              accessibilityLabel="Save inquiry changes"
              style={[styles.primaryBtn, saving ? styles.btnDisabled : null]}
              disabled={saving}
              onPress={() => void saveProfile()}
            >
              <Text style={styles.primaryBtnText}>
                {saving ? "Saving…" : "Save changes"}
              </Text>
            </Pressable>
            </AdminFormSection>

            <AdminFormSection title="Activity" testID="inquiry-detail-activity" description="Type and notes are stored on the inquiry timeline.">
            <View style={styles.typeRow}>
              {ACTION_TYPES.map((t) => (
                <Pressable
                  key={t}
                  testID={`inquiry-action-type-${t}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Action type ${t}`}
                  onPress={() => setActionType(t)}
                  style={[
                    styles.typeChip,
                    actionType === t ? styles.typeChipOn : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      actionType === t ? styles.typeChipTextOn : null,
                    ]}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              testID="inquiry-action-remarks"
              accessibilityLabel="Activity note text"
              style={[styles.input, styles.textArea]}
              value={actionRemarks}
              onChangeText={setActionRemarks}
              placeholder="What happened on this follow-up?"
              placeholderTextColor={Colors.textTertiary}
              multiline
            />
            <Pressable
              testID="inquiry-add-action"
              accessibilityRole="button"
              accessibilityLabel="Add activity to timeline"
              style={[styles.primaryBtn, saving ? styles.btnDisabled : null]}
              disabled={saving || !actionRemarks.trim()}
              onPress={() => void addNote()}
            >
              <Text style={styles.primaryBtnText}>Add to timeline</Text>
            </Pressable>
            </AdminFormSection>
          </>
        ) : (
          <View style={styles.readOnlyBanner}>
            <Text style={styles.readOnlyText}>
              Read-only: your role does not include CRM write access.
            </Text>
          </View>
        )}

      <AdminFormSection title="Timeline" testID="inquiry-detail-timeline">
        {(detail.actions ?? []).length === 0 ? (
          <Text style={styles.muted}>No activity yet.</Text>
        ) : (
          (detail.actions ?? []).map((a) => (
            <View key={a.id} style={styles.timelineCard}>
              <View style={styles.timelineHead}>
                <Text style={styles.timelineType}>{a.actionType}</Text>
                <Text style={styles.timelineDate}>
                  {a.actionDate ? a.actionDate.slice(0, 10) : ""}
                </Text>
              </View>
              <Text style={styles.timelineBody}>{a.remarks}</Text>
              {canWrite ? (
                <Pressable
                  testID={`inquiry-delete-action-${a.id}`}
                  accessibilityRole="button"
                  accessibilityLabel="Delete timeline entry"
                  onPress={() => void removeAction(a.id)}
                  style={styles.deleteLink}
                >
                  <Text style={styles.deleteLinkText}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </AdminFormSection>

      <AdminPickerSheet
        visible={locationPickerOpen}
        title="Choose location"
        options={locationOptions}
        selectedId={locationId}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={(opt) => setLocationId(opt.id)}
        testID="inquiry-location-sheet"
      />

      <AdminPickerSheet
        visible={staffPickerOpen}
        title="Assign staff"
        options={staffOptions}
        selectedId={detail.assignedStaff?.id ?? null}
        loading={staffLoading}
        onClose={() => setStaffPickerOpen(false)}
        onSelect={(opt) => void assignStaff(opt.id)}
        testID="inquiry-staff-sheet"
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  cardLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  cardValue: { fontSize: FontSize.md, color: Colors.text, marginTop: 2 },
  muted: { fontSize: FontSize.sm, color: Colors.textSecondary },
  couponHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginTop: 4,
  },
  couponCode: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
  },
  couponStatus: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.primary,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    overflow: "hidden",
  },
  banner: {
    backgroundColor: "#fff7ed",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  bannerText: { color: "#9a3412", fontSize: FontSize.sm },
  readOnlyBanner: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  readOnlyText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusChipOn: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  statusChipText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textSecondary },
  statusChipTextOn: { color: Colors.primary },
  rowGap: { gap: Spacing.sm, marginBottom: Spacing.sm },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.sm },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  secondaryBtnText: { color: Colors.text, fontWeight: "700", fontSize: FontSize.sm },
  btnDisabled: { opacity: 0.6 },
  hint: { fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: 6 },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  inputHalf: { flex: 1 },
  inlineInputs: { flexDirection: "row", gap: Spacing.sm },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  pickerBtnText: { flex: 1, fontSize: FontSize.sm, color: Colors.text, marginRight: 8 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.sm },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  typeChipOn: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  typeChipText: { fontSize: 10, fontWeight: "700", color: Colors.textSecondary },
  typeChipTextOn: { color: Colors.primary },
  timelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timelineHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  timelineType: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.primary },
  timelineDate: { fontSize: FontSize.xs, color: Colors.textTertiary },
  timelineBody: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  deleteLink: { marginTop: 8, alignSelf: "flex-start" },
  deleteLinkText: { color: Colors.error, fontWeight: "700", fontSize: FontSize.xs },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  linkRowText: { flex: 1, minWidth: 0 },
  linkText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.primary },
  confirmedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: "#dcfce7",
  },
  confirmedPillText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: "#166534",
    textTransform: "uppercase",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  modalClose: { fontSize: FontSize.md, fontWeight: "700", color: Colors.primary },
  modalSearch: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: 10,
    fontSize: FontSize.sm,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  modalRowText: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  modalSub: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  errorTitle: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 8,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
});
