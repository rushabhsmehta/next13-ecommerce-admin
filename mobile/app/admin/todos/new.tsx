import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import {
  AdminBottomActionBar,
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
  AdminQuickCreateModal,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
} from "@/components/admin";
import {
  BorderRadius,
  Colors,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { DateField } from "@/components/ui/DateField";
import { createOperationsClient } from "@/lib/operations";
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
  const opsClient = useMemo(
    () => createOperationsClient(authRequest),
    [authRequest]
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [staffList, setStaffList] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffCreateOpen, setStaffCreateOpen] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [assignedToStaffId, setAssignedToStaffId] = useState<string | null>(null);
  const [assignedStaffName, setAssignedStaffName] = useState<string | null>(null);

  const isoOk = !dueDate || /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
  const canSubmit = title.trim().length > 0 && !submitting && isoOk;

  const staffOptions = useMemo(
    () => staffList.map((s) => ({ id: s.id, label: s.name, subtitle: s.email })),
    [staffList]
  );

  async function openStaffPicker() {
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
      setAssignedToStaffId(saved.id);
      setAssignedStaffName(saved.name);
      setStaffCreateOpen(false);
      setStaffPickerOpen(false);
    } catch (err) {
      Alert.alert(
        "Create failed",
        err instanceof ApiError ? err.message : "Could not create staff."
      );
    } finally {
      setCreatingStaff(false);
    }
  }

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
    <AdminScreen
      keyboardAvoiding
      testID="todo-new-screen"
      footer={
        <AdminBottomActionBar
          primaryLabel="Create task"
          primaryIcon="add-circle-outline"
          primaryTestID="todo-new-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !title.trim()
              ? "Enter a title to create the task."
              : !isoOk
                ? "Choose a valid due date."
                : submitting
                  ? "Creating…"
                  : undefined
          }
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: "New task", headerShown: false }} />

      <AdminTopBar title="New task" subtitle="Task" onBackPress={() => router.back()} testID="todo-new-header" />

      <AdminFormSection title="Details" testID="todo-new-details">
        <AdminFormField label="Title" required>
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
        </AdminFormField>
        <AdminFormField label="Description">
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
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Scheduling" testID="todo-new-scheduling">
        <AdminFormField label="Priority">
          <AdminSegmentedControl
            options={PRIORITIES}
            value={priority}
            onChange={setPriority}
            testIDPrefix="todo-new-priority"
            scrollable={false}
          />
        </AdminFormField>
        <AdminFormField
          label="Due date"
          hint="Leave blank if there's no deadline."
        >
          <DateField
            testID="todo-new-due"
            accessibilityLabel="Due date"
            style={styles.input}
            placeholder="Choose due date"
            value={dueDate}
            onChange={setDueDate}
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Assignment" testID="todo-new-assignee">
        <Pressable
          testID="todo-new-staff-picker"
          accessibilityRole="button"
          accessibilityLabel="Choose operational staff to assign"
          style={styles.staffPickerBtn}
          onPress={() => void openStaffPicker()}
        >
          <Text style={styles.staffPickerText} numberOfLines={2}>
            {assignedStaffName ?? "Optional — tap to choose"}
          </Text>
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
      </AdminFormSection>

      <AdminPickerSheet
        visible={staffPickerOpen}
        title="Assign to staff"
        options={staffOptions}
        selectedId={assignedToStaffId}
        loading={staffLoading}
        onClose={() => setStaffPickerOpen(false)}
        onSelect={(opt) => {
          setAssignedToStaffId(opt.id);
          setAssignedStaffName(opt.label);
        }}
        footerAction={{
          label: "Add staff",
          testID: "todo-new-staff-add",
          onPress: () => setStaffCreateOpen(true),
        }}
        testID="todo-new-staff-sheet"
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
        testID="todo-new-staff-quick-create"
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
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
  textarea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  staffPickerBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  staffPickerText: { fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  clearStaffBtn: { alignSelf: "flex-start", marginTop: Spacing.sm },
  clearStaffText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.primary },
});
