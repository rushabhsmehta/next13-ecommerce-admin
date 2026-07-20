import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AdminBottomActionBar,
  AdminDangerZone,
  AdminErrorState,
  AdminFormField,
  AdminFormSection,
  AdminLoadingState,
  AdminPickerSheet,
  AdminQuickCreateModal,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
  AdminTopBarIconButton,
} from "@/components/admin";
import {
  BorderRadius,
  Colors,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { DateField } from "@/components/ui/DateField";
import { createOperationsClient } from "@/lib/operations";
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
  const opsClient = useMemo(
    () => createOperationsClient(authRequest),
    [authRequest]
  );

  const [todo, setTodo] = useState<Todo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [staffList, setStaffList] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffCreateOpen, setStaffCreateOpen] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);

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

  async function openStaffPicker() {
    if (!canWrite) return;
    setStaffPickerOpen(true);
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

  async function createStaffQuick(values: Record<string, string>) {
    const name = values.name?.trim();
    const email = values.email?.trim();
    const password = values.password?.trim();
    if (!name || !email || !password) return;
    setCreatingStaff(true);
    try {
      const saved = await opsClient.createStaff({ name, email, password });
      setStaffList((prev) => {
        if (prev.some((s) => s.id === saved.id)) return prev;
        return [{ id: saved.id, name: saved.name, email: saved.email }, ...prev];
      });
      setStaffCreateOpen(false);
      setStaffPickerOpen(false);
      await patch({ assignedToStaffId: saved.id });
    } catch (err) {
      Alert.alert(
        "Create failed",
        err instanceof ApiError ? err.message : "Could not create staff."
      );
    } finally {
      setCreatingStaff(false);
    }
  }

  const staffOptions = useMemo(
    () => staffList.map((s) => ({ id: s.id, label: s.name, subtitle: s.email })),
    [staffList]
  );

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
    return <AdminLoadingState label="Loading task…" testID="todo-detail-loading" />;
  }

  if (error || !todo) {
    return (
      <AdminScreen testID="todo-detail-error">
        <AdminErrorState
          message={error ?? "Task not found"}
          onRetry={() => void load()}
          testID="todo-detail-error-state"
        />
      </AdminScreen>
    );
  }

  const completeFooter =
    todo.status !== "DONE" && canWrite ? (
      <AdminBottomActionBar
        primaryLabel="Mark complete"
        primaryIcon="checkmark-circle-outline"
        primaryTestID="todo-detail-complete"
        primaryDisabled={saving}
        disabledReason={saving ? "Saving changes…" : undefined}
        onPrimaryPress={completeNow}
        primaryHint="Marks this task done with completion metadata."
      />
    ) : null;

  return (
    <AdminScreen
      keyboardAvoiding
      testID="todo-detail-screen"
      bottomInset={completeFooter ? 0 : Spacing.md}
      footer={completeFooter}
    >
      <Stack.Screen options={{ title: todo.title, headerShown: false }} />

      <AdminTopBar
        title={todo.title}
        subtitle="Task"
        onBackPress={() => router.back()}
        testID="todo-detail-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarIconButton
              testID="todo-detail-delete"
              icon="trash-outline"
              label="Delete task"
              onPress={deleteTodo}
            />
          ) : null
        }
      />

      <AdminFormSection title="Details" testID="todo-detail-details">
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
        <AdminFormField label="Due date">
          <DateField
            testID="todo-detail-due"
            accessibilityLabel="Due date"
            style={styles.input}
            value={todo.dueDate ? todo.dueDate.slice(0, 10) : ""}
            onChange={(v) => void patch({ dueDate: v || null })}
            placeholder="No due date"
            disabled={!canWrite || saving}
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Status & priority" testID="todo-detail-status">
        <AdminFormField label="Status">
          <AdminSegmentedControl
            options={STATUS_CHOICES}
            value={todo.status}
            onChange={(id) => {
              if (canWrite && !saving) void patch({ status: id });
            }}
            testIDPrefix="todo-status"
            scrollable={false}
          />
        </AdminFormField>
        <AdminFormField label="Priority">
          <AdminSegmentedControl
            options={PRIORITIES}
            value={todo.priority}
            onChange={(id) => {
              if (canWrite && !saving) void patch({ priority: id });
            }}
            testIDPrefix="todo-priority"
            scrollable={false}
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Assignment" testID="todo-detail-assignee">
        <View style={styles.staffRow}>
          <Text style={styles.staffSummary} numberOfLines={2}>
            {todo.assignedStaff ? todo.assignedStaff.name : "Not assigned"}
          </Text>
          {canWrite ? (
            <View style={styles.staffActions}>
              <Pressable
                testID="todo-detail-staff-assign"
                accessibilityRole="button"
                accessibilityLabel={todo.assignedStaff ? "Change staff assignment" : "Assign staff"}
                style={styles.staffLinkBtn}
                disabled={saving}
                onPress={() => void openStaffPicker()}
              >
                <Text style={styles.staffLinkText}>{todo.assignedStaff ? "Change" : "Assign"}</Text>
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
      </AdminFormSection>

      {todo.completedAt ? (
        <View style={styles.metaCard}>
          <Ionicons name="checkmark-done" size={16} color={Colors.success} />
          <Text style={styles.metaText}>
            Completed on {new Date(todo.completedAt).toLocaleString("en-IN")}
            {todo.completedByName ? ` by ${todo.completedByName}` : ""}
          </Text>
        </View>
      ) : null}

      {canWrite ? (
        <AdminDangerZone
          actions={[
            {
              id: "delete",
              label: "Delete task",
              hint: "Permanently removes this task.",
              onPress: deleteTodo,
              testID: "todo-detail-delete-zone",
            },
          ]}
        />
      ) : null}

      {todo.status !== "DONE" && canWrite ? (
        <AdminBottomActionBar
          primaryLabel="Mark complete"
          primaryIcon="checkmark-circle-outline"
          primaryTestID="todo-detail-complete"
          primaryDisabled={saving}
          disabledReason={saving ? "Saving changes…" : undefined}
          onPrimaryPress={completeNow}
          primaryHint="Marks this task done with completion metadata."
        />
      ) : null}

      <AdminPickerSheet
        visible={staffPickerOpen}
        title="Assign to staff"
        options={staffOptions}
        selectedId={todo.assignedStaff?.id ?? null}
        loading={staffLoading}
        onClose={() => setStaffPickerOpen(false)}
        onSelect={(opt) => void patch({ assignedToStaffId: opt.id })}
        footerAction={{
          label: "Add staff",
          testID: "todo-detail-staff-add",
          onPress: () => setStaffCreateOpen(true),
        }}
        testID="todo-detail-staff-sheet"
      />
      <AdminQuickCreateModal
        visible={staffCreateOpen}
        title="Add staff"
        hint="Creates operational staff and assigns them to this task."
        fields={[
          {
            key: "name",
            label: "Name",
            placeholder: "e.g. Priya Shah",
            required: true,
            autoCapitalize: "words",
            maxLength: 200,
          },
          {
            key: "email",
            label: "Email",
            placeholder: "staff@example.com",
            required: true,
            keyboardType: "email-address",
            autoCapitalize: "none",
            maxLength: 200,
          },
          {
            key: "password",
            label: "Password",
            placeholder: "Temporary password",
            required: true,
            secureTextEntry: true,
            autoCapitalize: "none",
            maxLength: 100,
          },
        ]}
        submitLabel="Create staff"
        loading={creatingStaff}
        onClose={() => setStaffCreateOpen(false)}
        onSubmit={createStaffQuick}
        testID="todo-detail-staff-quick-create"
      />
    </AdminScreen>
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
    <AdminFormField label={label}>
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
    </AdminFormField>
  );
}

const styles = StyleSheet.create({
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
