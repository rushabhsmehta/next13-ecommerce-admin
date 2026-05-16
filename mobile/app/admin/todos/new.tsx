import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import {
  BorderRadius,
  Colors,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { fetchActiveOperationalStaff } from "@/lib/operational-staff";
import {
  createTodosClient,
  TodoCreateInput,
  TodoPriority,
} from "@/lib/todos";

const PRIORITIES: { id: TodoPriority; label: string }[] = [
  { id: "LOW", label: "Low" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" },
];

export default function NewTodoScreen() {
  return (
    <PermissionGate permission="todos.write">
      <NewTodoScreenInner />
    </PermissionGate>
  );
}

function NewTodoScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );
  const client = useMemo(() => createTodosClient(authRequest), [authRequest]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [staffModal, setStaffModal] = useState(false);
  const [staffList, setStaffList] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [assignedToStaffId, setAssignedToStaffId] = useState<string | null>(null);
  const [assignedStaffName, setAssignedStaffName] = useState<string | null>(null);

  const isoOk = !dueDate || /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
  const canSubmit = title.trim().length > 0 && !submitting && isoOk;

  async function openStaffModal() {
    setStaffModal(true);
    setStaffSearch("");
    setStaffLoading(true);
    try {
      const rows = await fetchActiveOperationalStaff(authRequest);
      setStaffList(rows);
    } catch {
      setStaffList([]);
      Alert.alert(
        "Staff",
        "Could not load operational staff. You may need organization member access."
      );
    } finally {
      setStaffLoading(false);
    }
  }

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [staffList, staffSearch]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: TodoCreateInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        ...(assignedToStaffId ? { assignedToStaffId } : {}),
      };
      const created = await client.create(payload);
      router.replace(`/admin/todos/${created.id}` as never);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not create the task.";
      Alert.alert("Create failed", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "New task", headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="todo-new-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>New task</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Title *</Text>
        <TextInput
          testID="todo-new-title"
          accessibilityLabel="Task title"
          style={styles.input}
          placeholder="Call customer back"
          placeholderTextColor={Colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
          maxLength={500}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          testID="todo-new-description"
          accessibilityLabel="Task description"
          style={[styles.input, styles.textarea]}
          placeholder="Add context, links, or details…"
          placeholderTextColor={Colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={5000}
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.row}>
          {PRIORITIES.map((p) => {
            const active = priority === p.id;
            return (
              <Pressable
                key={p.id}
                testID={`todo-new-priority-${p.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Priority ${p.label}`}
                style={[styles.choice, active ? styles.choiceActive : null]}
                onPress={() => setPriority(p.id)}
              >
                <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Due date</Text>
        <TextInput
          testID="todo-new-due"
          accessibilityLabel="Due date in YYYY-MM-DD format"
          style={styles.input}
          placeholder="YYYY-MM-DD (optional)"
          placeholderTextColor={Colors.textTertiary}
          value={dueDate}
          onChangeText={setDueDate}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {!isoOk ? (
          <Text style={styles.helpError}>Use the format YYYY-MM-DD.</Text>
        ) : (
          <Text style={styles.help}>Leave blank if there's no deadline.</Text>
        )}

        <Text style={styles.label}>Assign to staff</Text>
        <Pressable
          testID="todo-new-staff-picker"
          accessibilityRole="button"
          accessibilityLabel="Choose operational staff to assign"
          style={styles.staffPickerBtn}
          onPress={() => void openStaffModal()}
        >
          <Text style={styles.staffPickerText} numberOfLines={2}>
            {assignedStaffName ?? "Optional — tap to choose"}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </Pressable>
        {assignedToStaffId ? (
          <Pressable
            testID="todo-new-staff-clear"
            accessibilityRole="button"
            accessibilityLabel="Clear staff assignment"
            onPress={() => {
              setAssignedToStaffId(null);
              setAssignedStaffName(null);
            }}
            style={styles.clearStaffBtn}
          >
            <Text style={styles.clearStaffText}>Clear assignment</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="todo-new-submit"
          accessibilityRole="button"
          accessibilityLabel="Create task"
          disabled={!canSubmit}
          style={[styles.submit, !canSubmit ? styles.submitDisabled : null]}
          onPress={submit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.submitText}>Create task</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        visible={staffModal}
        animationType="slide"
        onRequestClose={() => setStaffModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>Assign to staff</Text>
            <Pressable
              testID="todo-new-staff-modal-close"
              accessibilityRole="button"
              accessibilityLabel="Close staff picker"
              onPress={() => setStaffModal(false)}
            >
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.modalSearch}
            value={staffSearch}
            onChangeText={setStaffSearch}
            placeholder="Search name or email…"
            placeholderTextColor={Colors.textTertiary}
          />
          {staffLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={Colors.primary} />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={filteredStaff}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[styles.help, { padding: 16 }]}>No staff found.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  testID={`todo-new-staff-option-${item.id}`}
                  style={styles.modalRow}
                  onPress={() => {
                    setAssignedToStaffId(item.id);
                    setAssignedStaffName(item.name);
                    setStaffModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{item.name}</Text>
                    <Text style={styles.modalEmail}>{item.email}</Text>
                  </View>
                  {assignedToStaffId === item.id ? (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  ) : null}
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: 4,
  },
  choice: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  choiceActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  choiceText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textSecondary },
  choiceTextActive: { color: Colors.primary },
  help: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  helpError: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
  },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
  staffPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: 4,
  },
  staffPickerText: { flex: 1, fontSize: FontSize.md, color: Colors.text, marginRight: 8 },
  clearStaffBtn: { alignSelf: "flex-start", marginTop: Spacing.sm },
  clearStaffText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.primary },
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  modalName: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  modalEmail: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});
