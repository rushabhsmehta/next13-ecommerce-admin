import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/expo";
import { withAuth } from "@/lib/api";
import { createAssociateInquiryClient, type AssociateInquiry } from "@/lib/associate-inquiries";
import { Colors, BorderRadius, FontSize, Spacing } from "@/constants/theme";
import { DateField } from "@/components/ui/DateField";

const STATUSES = ["PENDING", "HOT_QUERY", "QUERY_SENT", "CONFIRMED", "CANCELLED"] as const;

export default function AssociateInquiryDetailScreen() {
  const { inquiryId } = useLocalSearchParams<{ inquiryId: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createAssociateInquiryClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inquiry, setInquiry] = useState<AssociateInquiry | null>(null);
  const [remarksDraft, setRemarksDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("PENDING");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");

  const load = useCallback(async () => {
    if (!inquiryId) return;
    setLoading(true);
    try {
      const data = await client.getInquiry(inquiryId);
      setInquiry(data);
      setRemarksDraft(data?.remarks ?? "");
      setStatusDraft(data?.status ?? "PENDING");
      setNextFollowUpDate(data?.nextFollowUpDate ? data.nextFollowUpDate.slice(0, 10) : "");
    } catch {
      setInquiry(null);
    } finally {
      setLoading(false);
    }
  }, [client, inquiryId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function saveCoreUpdates() {
    if (!inquiry || !inquiryId) return;
    setSaving(true);
    try {
      const updated = await client.updateInquiry(inquiryId, {
        customerName: inquiry.customerName,
        customerMobileNumber: inquiry.customerMobileNumber,
        locationId: inquiry.locationId,
        journeyDate: inquiry.journeyDate ? inquiry.journeyDate.slice(0, 10) : "",
        status: statusDraft,
        remarks: remarksDraft,
        nextFollowUpDate: nextFollowUpDate || null,
      });
      setInquiry(updated);
      Alert.alert("Saved", "Inquiry updated.");
    } catch (error: any) {
      Alert.alert("Update failed", error?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function quickUpdateStatus(status: string) {
    if (!inquiryId) return;
    try {
      const updated = await client.updateStatus(inquiryId, status);
      setInquiry(updated);
      setStatusDraft(updated.status);
    } catch (error: any) {
      Alert.alert("Status update failed", error?.message ?? "Please try again.");
    }
  }

  async function addAction() {
    if (!inquiryId || !actionRemarks.trim()) return;
    setSaving(true);
    try {
      await client.addAction(inquiryId, {
        actionType: "FOLLOW_UP",
        remarks: actionRemarks.trim(),
        actionDate: new Date().toISOString().slice(0, 10),
      });
      setActionRemarks("");
      await load();
    } catch (error: any) {
      Alert.alert("Action failed", error?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAction(actionId: string) {
    if (!inquiryId) return;
    try {
      await client.deleteAction(inquiryId, actionId);
      await load();
    } catch (error: any) {
      Alert.alert("Delete failed", error?.message ?? "Please try again.");
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (!inquiry) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Inquiry not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{inquiry.customerName}</Text>
      <Text style={styles.muted}>{inquiry.customerMobileNumber}</Text>
      <Text style={styles.muted}>{inquiry.location?.label ?? "Unknown location"}</Text>

      <Text style={styles.sectionTitle}>Quick status</Text>
      <View style={styles.statusWrap}>
        {STATUSES.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.statusPill, inquiry.status === status ? styles.statusPillActive : null]}
            onPress={() => quickUpdateStatus(status)}
          >
            <Text style={inquiry.status === status ? styles.statusTextActive : styles.statusText}>{status}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Edit details</Text>
      <Text style={styles.label}>Status</Text>
      <TextInput style={styles.input} value={statusDraft} onChangeText={setStatusDraft} />
      <Text style={styles.label}>Next follow-up date</Text>
      <DateField
        style={styles.input}
        value={nextFollowUpDate}
        onChange={setNextFollowUpDate}
        placeholder="Choose follow-up date"
        testID="associate-inquiry-follow-up"
        accessibilityLabel="Next follow-up date"
      />
      <Text style={styles.label}>Remarks</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={remarksDraft}
        onChangeText={setRemarksDraft}
        multiline
        numberOfLines={4}
      />
      <TouchableOpacity style={[styles.button, saving ? styles.disabled : null]} onPress={saveCoreUpdates} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Save updates"}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Add action</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={actionRemarks}
        onChangeText={setActionRemarks}
        placeholder="Write follow-up notes"
        placeholderTextColor={Colors.textTertiary}
        multiline
        numberOfLines={3}
      />
      <TouchableOpacity style={[styles.button, saving ? styles.disabled : null]} onPress={addAction} disabled={saving}>
        <Text style={styles.buttonText}>Add action</Text>
      </TouchableOpacity>

      <View style={styles.actionsList}>
        {(inquiry.actions ?? []).map((action) => (
          <View key={action.id} style={styles.actionCard}>
            <View style={styles.actionHead}>
              <Text style={styles.actionType}>{action.actionType}</Text>
              <TouchableOpacity onPress={() => deleteAction(action.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.muted}>{action.remarks}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 32 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: "800" },
  muted: { color: Colors.textSecondary },
  sectionTitle: { marginTop: Spacing.lg, fontWeight: "700", color: Colors.text },
  label: { color: Colors.textSecondary, fontWeight: "600", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.text,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  button: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    paddingVertical: 12,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.7 },
  statusWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusPill: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  statusText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  statusTextActive: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: "700" },
  actionsList: { gap: 8, marginTop: 8 },
  actionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  actionHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  actionType: { color: Colors.text, fontWeight: "700" },
  deleteText: { color: Colors.error, fontWeight: "600" },
});
