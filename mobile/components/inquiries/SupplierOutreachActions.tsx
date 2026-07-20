import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import {
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { createOperationsClient, type Supplier } from "@/lib/operations";
import {
  buildSupplierInquiryMessage,
  createInquirySupplierClient,
  formatPhoneForWhatsApp,
  summarizeMobileOutreach,
  type MobileOutreachItem,
} from "@/lib/inquiry-supplier";
import type { InquiryActionItem } from "@/lib/associate-inquiries";

export interface SupplierOutreachInquiryContext {
  id: string;
  locationLabel?: string;
  journeyDate?: string | null;
  numAdults?: number;
  numChildren5to11?: number;
  numChildrenBelow5?: number;
  remarks?: string | null;
}

interface Props {
  inquiry: SupplierOutreachInquiryContext;
  actions: InquiryActionItem[];
  canWrite: boolean;
  onChanged: () => void;
}

type Mode = "email" | "whatsapp" | null;

export function SupplierOutreachActions({
  inquiry,
  actions,
  canWrite,
  onChanged,
}: Props) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );
  const opsClient = useMemo(
    () => createOperationsClient(authRequest),
    [authRequest]
  );
  const supplierClient = useMemo(
    () => createInquirySupplierClient(authRequest),
    [authRequest]
  );

  const [mode, setMode] = useState<Mode>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [markingKey, setMarkingKey] = useState<string | null>(null);

  const outreach = useMemo(
    () => summarizeMobileOutreach(actions),
    [actions]
  );

  const templates = useMemo(
    () =>
      buildSupplierInquiryMessage({
        location: inquiry.locationLabel,
        journeyDate: inquiry.journeyDate,
        numAdults: inquiry.numAdults,
        numChildren5to11: inquiry.numChildren5to11,
        numChildrenBelow5: inquiry.numChildrenBelow5,
        remarks: inquiry.remarks,
      }),
    [inquiry]
  );

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await opsClient.listSuppliers({ limit: 100 });
      setSuppliers(res.suppliers || []);
    } catch {
      setSuppliers([]);
    }
  }, [opsClient]);

  useEffect(() => {
    if (mode) void loadSuppliers();
  }, [mode, loadSuppliers]);

  function openMode(next: Mode) {
    if (!next) return;
    setMode(next);
    setSelectedId("");
    setSelectedName("");
    setContact("");
    setSubject(templates.subject);
    setMessage(next === "email" ? templates.body : templates.whatsappBody);
  }

  function closeModal() {
    setMode(null);
    setPickerOpen(false);
  }

  const pickerOptions = useMemo(() => {
    return suppliers
      .filter((s) =>
        mode === "email" ? Boolean(s.email?.trim()) : Boolean(s.contact?.trim())
      )
      .map((s) => ({
        id: s.id,
        label: s.name,
        subtitle: mode === "email" ? s.email || undefined : s.contact || undefined,
      }));
  }, [suppliers, mode]);

  async function submitEmail() {
    if (!contact.trim() || !subject.trim() || !message.trim()) {
      Alert.alert("Required", "Email, subject, and message are required.");
      return;
    }
    setSubmitting(true);
    try {
      await supplierClient.emailSupplier(inquiry.id, {
        to: contact.trim(),
        subject: subject.trim(),
        body: message.trim(),
        supplierId: selectedId || null,
        supplierName: selectedName || null,
      });
      Alert.alert("Sent", "Email sent. Status set to Asked to Supplier.");
      closeModal();
      onChanged();
    } catch (err) {
      Alert.alert(
        "Send failed",
        err instanceof ApiError ? err.message : "Could not send email."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitWhatsApp() {
    if (!contact.trim() || !message.trim()) {
      Alert.alert("Required", "Phone and message are required.");
      return;
    }
    const phone = formatPhoneForWhatsApp(contact);
    if (phone.length < 10) {
      Alert.alert("Invalid phone", "Enter a valid WhatsApp number.");
      return;
    }
    setSubmitting(true);
    try {
      await supplierClient.logWhatsAppSupplier(inquiry.id, {
        phone,
        supplierId: selectedId || null,
        supplierName: selectedName || null,
        messagePreview: message.trim().slice(0, 500),
      });
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message.trim())}`;
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("WhatsApp", "Could not open WhatsApp on this device.");
        onChanged();
        closeModal();
        return;
      }
      await Linking.openURL(url);
      closeModal();
      onChanged();
    } catch (err) {
      Alert.alert(
        "Failed",
        err instanceof ApiError
          ? err.message
          : "Could not log WhatsApp outreach."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function markQuote(item: MobileOutreachItem) {
    const key = `${item.supplierId || ""}|${item.contact}|${item.channel}`;
    setMarkingKey(key);
    try {
      await supplierClient.markSupplierQuoteReceived(inquiry.id, {
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        contact: item.contact,
        channel: item.channel,
        notes: "Quote received from supplier",
      });
      onChanged();
    } catch (err) {
      Alert.alert(
        "Failed",
        err instanceof ApiError ? err.message : "Could not mark quote received."
      );
    } finally {
      setMarkingKey(null);
    }
  }

  return (
    <>
      <AdminFormSection
        title="Supplier outreach"
        testID="inquiry-supplier-outreach"
      >
        {canWrite ? (
          <View style={styles.actionRow}>
            <Pressable
              testID="inquiry-email-supplier"
              accessibilityRole="button"
              accessibilityLabel="Email supplier"
              style={styles.actionBtn}
              onPress={() => openMode("email")}
            >
              <Ionicons name="mail-outline" size={18} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Email supplier</Text>
            </Pressable>
            <Pressable
              testID="inquiry-whatsapp-supplier"
              accessibilityRole="button"
              accessibilityLabel="WhatsApp supplier"
              style={styles.actionBtn}
              onPress={() => openMode("whatsapp")}
            >
              <Ionicons name="logo-whatsapp" size={18} color={Colors.primary} />
              <Text style={styles.actionBtnText}>WhatsApp supplier</Text>
            </Pressable>
          </View>
        ) : null}

        {outreach.length === 0 ? (
          <Text style={styles.muted}>
            No suppliers contacted yet for this inquiry.
          </Text>
        ) : (
          outreach.map((item) => {
            const key = `${item.supplierId || ""}|${item.contact}|${item.channel}`;
            const quoteReceived = Boolean(item.quoteReceivedAt);
            return (
              <View key={key} style={styles.outreachCard} testID={`outreach-${key}`}>
                <View style={styles.outreachHead}>
                  <Text style={styles.outreachName}>{item.supplierName}</Text>
                  <Text style={styles.outreachBadge}>
                    {item.channel === "WHATSAPP" ? "WhatsApp" : "Email"}
                    {quoteReceived ? " · Quote received" : " · Asked"}
                  </Text>
                </View>
                <Text style={styles.muted}>
                  {item.contact}
                  {item.actionDate ? ` · ${item.actionDate.slice(0, 10)}` : ""}
                </Text>
                {canWrite && !quoteReceived ? (
                  <Pressable
                    testID={`mark-quote-${key}`}
                    accessibilityRole="button"
                    accessibilityLabel="Mark quote received"
                    style={styles.markBtn}
                    disabled={markingKey === key}
                    onPress={() => void markQuote(item)}
                  >
                    <Text style={styles.markBtnText}>
                      {markingKey === key ? "Saving…" : "Mark quote received"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </AdminFormSection>

      <Modal
        visible={mode !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalRoot} testID={`supplier-outreach-${mode}`}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {mode === "email" ? "Email supplier" : "WhatsApp supplier"}
            </Text>
            <Pressable
              testID="supplier-outreach-close"
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={closeModal}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>
          </View>

          <AdminFormField label="Supplier">
            <Pressable
              testID="supplier-outreach-pick"
              accessibilityRole="button"
              accessibilityLabel="Choose supplier"
              style={styles.pickerBtn}
              onPress={() => setPickerOpen(true)}
            >
              <Text
                style={
                  selectedId ? styles.pickerValue : styles.pickerPlaceholder
                }
              >
                {selectedName || "Select supplier (optional)…"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
            </Pressable>
          </AdminFormField>

          <AdminFormField
            label={mode === "email" ? "Email" : "Phone"}
            required
          >
            <TextInput
              testID="supplier-outreach-contact"
              style={styles.input}
              value={contact}
              onChangeText={setContact}
              placeholder={
                mode === "email" ? "supplier@example.com" : "WhatsApp number"
              }
              placeholderTextColor={Colors.textTertiary}
              keyboardType={mode === "email" ? "email-address" : "phone-pad"}
              autoCapitalize="none"
            />
          </AdminFormField>

          {mode === "email" ? (
            <AdminFormField label="Subject" required>
              <TextInput
                testID="supplier-outreach-subject"
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholderTextColor={Colors.textTertiary}
              />
            </AdminFormField>
          ) : null}

          <AdminFormField label="Message" required>
            <TextInput
              testID="supplier-outreach-message"
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={setMessage}
              multiline
              placeholderTextColor={Colors.textTertiary}
            />
          </AdminFormField>

          <Pressable
            testID="supplier-outreach-submit"
            accessibilityRole="button"
            accessibilityLabel={mode === "email" ? "Send email" : "Open WhatsApp"}
            style={[styles.submitBtn, submitting ? styles.btnDisabled : null]}
            disabled={submitting}
            onPress={() =>
              void (mode === "email" ? submitEmail() : submitWhatsApp())
            }
          >
            <Text style={styles.submitText}>
              {submitting
                ? "Working…"
                : mode === "email"
                  ? "Send email"
                  : "Open WhatsApp"}
            </Text>
          </Pressable>
        </View>

        <AdminPickerSheet
          visible={pickerOpen}
          title="Supplier"
          options={pickerOptions}
          selectedId={selectedId}
          onClose={() => setPickerOpen(false)}
          onSelect={(opt) => {
            const found = suppliers.find((s) => s.id === opt.id);
            setSelectedId(opt.id);
            setSelectedName(opt.label);
            if (found) {
              setContact(
                mode === "email"
                  ? found.email?.trim() || ""
                  : found.contact?.trim() || ""
              );
            }
          }}
          testID="supplier-outreach-picker"
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
  muted: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  outreachCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  outreachHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
    alignItems: "center",
  },
  outreachName: { flex: 1, fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  outreachBadge: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.primary },
  markBtn: { alignSelf: "flex-start", marginTop: Spacing.sm },
  markBtnText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pickerValue: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textTertiary },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textarea: { minHeight: 160, textAlignVertical: "top" },
  submitBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
  btnDisabled: { opacity: 0.5 },
});
