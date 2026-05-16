import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
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
import {
  BorderRadius,
  Colors,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { fetchActiveOperationalStaff } from "@/lib/operational-staff";
import {
  createTodosClient,
  Todo,
  TodoPriority,
  TodoStatus,
  TodoUpdateInput,
} from "@/lib/todos";

const STATUS_CHOICES: { id: TodoStatus; label: string }[] = [
  { id: "TODO", label: "Open" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "DONE", label: "Done" },
];

const PRIORITIES: { id: TodoPriority; label: string }[] = [
  { id: "LOW", label: "Low" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" },
];

export default function TodoDetailScreen() {
  return (
    <PermissionGate permission="todos.read">
      <TodoDetailScreenInner />
    </PermissionGate>
  );
}

function TodoDetailScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("todos.write");
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );
  const client = useMemo(() => createTodosClient(authRequest), [authRequest]);

  const [todo, setTodo] = useState<Todo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [staffModal, setStaffModal] = useState(false);
  const [staffList, setStaffList] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const next = await client.get(id);
      setTodo(next);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not load task.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id, client]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(fields: TodoUpdateInput) {
    if (!todo || !canWrite) return;
    setSaving(true);
    try {
      const next = await client.update(todo.id, {
        ...(fields.title !== undefined && { title: fields.title }),
        ...(fields.description !== undefined && {
          description: fields.description ?? "",
        }),
        ...(fields.priority !== undefined && { priority: fields.priority }),
        ...(fields.status !== undefined && { status: fields.status }),
        ...(fields.dueDate !== undefined && { dueDate: fields.dueDate }),
        ...(fields.assignedToStaffId !== undefined && {
          assignedToStaffId: fields.assignedToStaffId,
        }),
      });
      setTodo(next);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Update failed.";
      Alert.alert("Update failed", message);
    } finally {
      setSaving(false);
    }
  }

  async function openStaffModal() {
    if (!canWrite) return;
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

  function confirmClearStaff() {
    if (!todo || !canWrite) return;
    Alert.alert("Unassign staff", "Remove operational staff from this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unassign",
        onPress: () => void patch({ assignedToStaffId: null }),
      },
    ]);
  }

  async function completeNow() {
    if (!todo || !canWrite) return;
    setSaving(true);
    try {
      const next = await client.complete(todo.id);
      setTodo(next);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not complete.";
      Alert.alert("Complete failed", message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTodo() {
    if (!todo || !canWrite) return;
    Alert.alert("Delete task", `Delete "${todo.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await client.delete(todo.id);
            router.back();
          } catch (err) {
            const message = err instanceof ApiError ? err.message : "Delete failed.";
            Alert.alert("Delete failed", message);
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !todo) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={36} color={Colors.error} />
        <Text style={styles.emptyTitle}>{error ?? "Task not found"}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading task"
          onPress={() => void load()}
          style={styles.retryBtn}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: todo.title, headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="todo-detail-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerBody}>
          <Text style={styles.kicker}>Task</Text>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {todo.title}
          </Text>
        </View>
        {canWrite ? (
          <Pressable
            testID="todo-detail-delete"
            accessibilityRole="button"
            accessibilityLabel="Delete task"
            onPress={deleteTodo}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <DetailField
          label="Title"
          value={todo.title}
          editable={canWrite}
          onSubmit={(v) => void patch({ title: v })}
        />
        <DetailField
          label="Description"
          value={todo.description ?? ""}
          editable={canWrite}
          multiline
          onSubmit={(v) => void patch({ description: v })}
        />
        <DetailField
          label="Due date (YYYY-MM-DD)"
          value={todo.dueDate ? todo.dueDate.slice(0, 10) : ""}
          editable={canWrite}
          onSubmit={(v) => void patch({ dueDate: v || null })}
        />

        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.row}>
          {STATUS_CHOICES.map((s) => {
            const active = todo.status === s.id;
            return (
              <Pressable
                key={s.id}
                testID={`todo-status-${s.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Set status to ${s.label}`}
                disabled={!canWrite || saving}
                style={[styles.choice, active ? styles.choiceActive : null]}
                onPress={() => void patch({ status: s.id })}
              >
                <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.row}>
          {PRIORITIES.map((p) => {
            const active = todo.priority === p.id;
            return (
              <Pressable
                key={p.id}
                testID={`todo-priority-${p.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Set priority to ${p.label}`}
                disabled={!canWrite || saving}
                style={[styles.choice, active ? styles.choiceActive : null]}
                onPress={() => void patch({ priority: p.id })}
              >
                <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Operational staff</Text>
        <View style={styles.staffRow}>
          <Text style={styles.staffSummary} numberOfLines={2}>
            {todo.assignedStaff
              ? todo.assignedStaff.name
              : "Not assigned"}
          </Text>
          {canWrite ? (
            <View style={styles.staffActions}>
              <Pressable
                testID="todo-detail-staff-assign"
                accessibilityRole="button"
                accessibilityLabel={
                  todo.assignedStaff ? "Change staff assignment" : "Assign staff"
                }
                style={styles.staffLinkBtn}
                disabled={saving}
                onPress={() => void openStaffModal()}
              >
                <Text style={styles.staffLinkText}>
                  {todo.assignedStaff ? "Change" : "Assign"}
                </Text>
              </Pressable>
              {todo.assignedStaff ? (
                <Pressable
                  testID="todo-detail-staff-clear"
                  accessibilityRole="button"
                  accessibilityLabel="Clear staff assignment"
                  style={styles.staffLinkBtn}
                  disabled={saving}
                  onPress={confirmClearStaff}
                >
                  <Text style={styles.staffLinkTextMuted}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {todo.status !== "DONE" && canWrite ? (
          <Pressable
            testID="todo-detail-complete"
            accessibilityRole="button"
            accessibilityLabel="Mark task complete"
            disabled={saving}
            style={[styles.completeBtn, saving ? styles.disabled : null]}
            onPress={completeNow}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.completeBtnText}>Mark complete</Text>
          </Pressable>
        ) : null}

        {todo.completedAt ? (
          <View style={styles.metaCard}>
            <Ionicons name="checkmark-done" size={16} color={Colors.success} />
            <Text style={styles.metaText}>
              Completed on {new Date(todo.completedAt).toLocaleString("en-IN")}
              {todo.completedByName ? ` by ${todo.completedByName}` : ""}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={staffModal}
        animationType="slide"
        onRequestClose={() => setStaffModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>Assign to staff</Text>
            <Pressable
              testID="todo-detail-staff-modal-close"
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
                <Text style={[styles.emptyHint, { padding: 16 }]}>No staff found.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  testID={`todo-detail-staff-option-${item.id}`}
                  style={styles.modalRow}
                  onPress={() => {
                    void patch({ assignedToStaffId: item.id });
                    setStaffModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{item.name}</Text>
                    <Text style={styles.modalEmail}>{item.email}</Text>
                  </View>
                  {todo.assignedStaff?.id === item.id ? (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  ) : null}
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function DetailField({
  label,
  value,
  editable,
  multiline,
  onSubmit,
}: {
  label: string;
  value: string;
  editable: boolean;
  multiline?: boolean;
  onSubmit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  const dirty = draft !== value;

  return (
    <View style={{ marginTop: Spacing.md }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, multiline ? styles.textarea : null]}
        value={draft}
        editable={editable}
        multiline={multiline}
        onChangeText={setDraft}
        placeholder={multiline ? "—" : ""}
        placeholderTextColor={Colors.textTertiary}
      />
      {editable && dirty ? (
        <View style={styles.fieldActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel edit"
            onPress={() => setDraft(value)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save change"
            onPress={() => onSubmit(draft)}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  retryBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  retryBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text, textAlign: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
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
  headerBody: { flex: 1 },
  kicker: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text, marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: "#fff1f2",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  sectionLabel: {
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
  textarea: { minHeight: 88, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: Spacing.sm, marginTop: 4, flexWrap: "wrap" },
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
  fieldActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: "700", fontSize: FontSize.sm },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.sm },
  completeBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  disabled: { opacity: 0.5 },
  completeBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
  metaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  metaText: { flex: 1, color: Colors.text, fontSize: FontSize.sm, fontWeight: "600" },
  staffRow: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  staffSummary: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  staffActions: { flexDirection: "row", gap: Spacing.md, flexWrap: "wrap" },
  staffLinkBtn: { paddingVertical: 4 },
  staffLinkText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
  staffLinkTextMuted: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textSecondary },
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
  emptyHint: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
