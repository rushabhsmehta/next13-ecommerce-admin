import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
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
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  createTodosClient,
  Todo,
  TodoPriority,
  TodoStatus,
} from "@/lib/todos";
import { fetchActiveOperationalStaff } from "@/lib/operational-staff";

type DuePreset = "ANY" | "OVERDUE" | "TODAY" | "WEEK";

const DUE_FILTERS: { id: DuePreset; label: string }[] = [
  { id: "ANY", label: "Any time" },
  { id: "OVERDUE", label: "Overdue" },
  { id: "TODAY", label: "Today" },
  { id: "WEEK", label: "This week" },
];

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolveDuePreset(preset: DuePreset): { dueFrom?: string; dueTo?: string } {
  const today = new Date();
  switch (preset) {
    case "OVERDUE": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { dueTo: toYmd(yesterday) };
    }
    case "TODAY":
      return { dueFrom: toYmd(today), dueTo: toYmd(today) };
    case "WEEK": {
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      return { dueFrom: toYmd(today), dueTo: toYmd(end) };
    }
    default:
      return {};
  }
}

const STATUS_TABS: { id: TodoStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "TODO", label: "Open" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "DONE", label: "Done" },
];

const PRIORITY_FILTERS: { id: TodoPriority | "ALL"; label: string }[] = [
  { id: "ALL", label: "Any priority" },
  { id: "HIGH", label: "High" },
  { id: "MEDIUM", label: "Medium" },
  { id: "LOW", label: "Low" },
];

const PAGE_SIZE = 50;

export default function TodosScreen() {
  return (
    <PermissionGate permission="todos.read">
      <TodosScreenInner />
    </PermissionGate>
  );
}

function TodosScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { permissions, isLoading: authLoading } = useCurrentUser();
  const canWrite = permissions.includes("todos.write");

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createTodosClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [items, setItems] = useState<Todo[]>([]);
  const [statusFilter, setStatusFilter] = useState<TodoStatus | "ALL">("TODO");
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | "ALL">("ALL");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [duePreset, setDuePreset] = useState<DuePreset>("ANY");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Staff picker modal
  const [staffModal, setStaffModal] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffList, setStaffList] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const { dueFrom, dueTo } = resolveDuePreset(duePreset);
        const res = await client.list({
          status: statusFilter === "ALL" ? undefined : statusFilter,
          priority: priorityFilter === "ALL" ? undefined : priorityFilter,
          assignee: assigneeId ?? undefined,
          dueFrom,
          dueTo,
          limit: PAGE_SIZE,
        });
        setItems(res.todos);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not load tasks.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, statusFilter, priorityFilter, assigneeId, duePreset]
  );

  useEffect(() => {
    if (!authLoading) void load("initial");
  }, [authLoading, load]);

  const hasActiveFilters =
    statusFilter !== "TODO" ||
    priorityFilter !== "ALL" ||
    assigneeId !== null ||
    duePreset !== "ANY";

  function clearFilters() {
    setStatusFilter("TODO");
    setPriorityFilter("ALL");
    setAssigneeId(null);
    setAssigneeName(null);
    setDuePreset("ANY");
  }

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

  async function completeTodo(todo: Todo) {
    if (todo.status === "DONE" || !canWrite) return;
    setBusyId(todo.id);
    try {
      const updated = await client.complete(todo.id);
      setItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not complete task.";
      Alert.alert("Could not complete", message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTodo(todo: Todo) {
    if (!canWrite) return;
    Alert.alert(
      "Delete task",
      `Are you sure you want to delete "${todo.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyId(todo.id);
            try {
              await client.delete(todo.id);
              setItems((prev) => prev.filter((t) => t.id !== todo.id));
            } catch (err) {
              const message =
                err instanceof ApiError ? err.message : "Could not delete task.";
              Alert.alert("Delete failed", message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Tasks", headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="todos-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? "Loading…" : `${items.length} shown`}
          </Text>
        </View>
        {canWrite ? (
          <Pressable
            testID="todos-new"
            accessibilityRole="button"
            accessibilityLabel="Create a new task"
            style={styles.newBtn}
            onPress={() => router.push("/admin/todos/new" as never)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.id;
          return (
            <Pressable
              key={tab.id}
              testID={`todos-status-${tab.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${tab.label}`}
              style={[styles.tab, active ? styles.tabActive : null]}
              onPress={() => setStatusFilter(tab.id)}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.priorityRow}>
        {PRIORITY_FILTERS.map((p) => {
          const active = priorityFilter === p.id;
          return (
            <Pressable
              key={p.id}
              testID={`todos-priority-${p.id}`}
              accessibilityLabel={`Filter by ${p.label}`}
              style={[styles.priorityChip, active ? styles.priorityChipActive : null]}
              onPress={() => setPriorityFilter(p.id)}
            >
              <Text
                style={[
                  styles.priorityChipText,
                  active ? styles.priorityChipTextActive : null,
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.priorityRow}>
        {DUE_FILTERS.map((d) => {
          const active = duePreset === d.id;
          return (
            <Pressable
              key={d.id}
              testID={`todos-due-${d.id}`}
              accessibilityLabel={`Filter by due ${d.label}`}
              style={[styles.priorityChip, active ? styles.priorityChipActive : null]}
              onPress={() => setDuePreset(d.id)}
            >
              <Text
                style={[
                  styles.priorityChipText,
                  active ? styles.priorityChipTextActive : null,
                ]}
              >
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.assigneeRow}>
        <Pressable
          testID="todos-assignee-picker"
          accessibilityRole="button"
          accessibilityLabel="Filter by assignee"
          style={[
            styles.assigneeBtn,
            assigneeId ? styles.assigneeBtnActive : null,
          ]}
          onPress={() => void openStaffModal()}
        >
          <Ionicons
            name="person-circle-outline"
            size={16}
            color={assigneeId ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.assigneeBtnText,
              assigneeId ? styles.assigneeBtnTextActive : null,
            ]}
            numberOfLines={1}
          >
            {assigneeName ?? "Any assignee"}
          </Text>
          {assigneeId ? (
            <Pressable
              testID="todos-assignee-clear"
              accessibilityLabel="Clear assignee filter"
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                setAssigneeId(null);
                setAssigneeName(null);
              }}
            >
              <Ionicons name="close-circle" size={16} color={Colors.primary} />
            </Pressable>
          ) : (
            <Ionicons name="chevron-down" size={14} color={Colors.textTertiary} />
          )}
        </Pressable>
        {hasActiveFilters ? (
          <Pressable
            testID="todos-clear-filters"
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            style={styles.clearFiltersBtn}
            onPress={clearFilters}
          >
            <Ionicons name="refresh-outline" size={14} color={Colors.primary} />
            <Text style={styles.clearFiltersText}>Reset filters</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons name="checkbox-outline" size={36} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No tasks</Text>
              <Text style={styles.emptyText}>
                {hasActiveFilters
                  ? "No tasks match these filters. Try widening the search or resetting filters."
                  : statusFilter === "DONE"
                  ? "Completed tasks will appear here."
                  : "Create a task to track follow-ups, calls, and reminders."}
              </Text>
              {hasActiveFilters ? (
                <Pressable
                  testID="todos-empty-reset"
                  accessibilityRole="button"
                  accessibilityLabel="Reset filters"
                  style={styles.emptyResetBtn}
                  onPress={clearFilters}
                >
                  <Text style={styles.emptyResetText}>Reset filters</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        renderItem={({ item }) => (
          <TodoRow
            todo={item}
            busy={busyId === item.id}
            canWrite={canWrite}
            onComplete={() => completeTodo(item)}
            onDelete={() => deleteTodo(item)}
            onOpen={() => router.push(`/admin/todos/${item.id}` as never)}
          />
        )}
      />

      <Modal
        visible={staffModal}
        animationType="slide"
        onRequestClose={() => setStaffModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>Filter by assignee</Text>
            <Pressable
              testID="todos-staff-modal-close"
              accessibilityRole="button"
              accessibilityLabel="Close assignee picker"
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
              ListHeaderComponent={
                <Pressable
                  testID="todos-staff-option-unassigned"
                  style={styles.modalRow}
                  onPress={() => {
                    setAssigneeId("unassigned");
                    setAssigneeName("Unassigned");
                    setStaffModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>Unassigned</Text>
                    <Text style={styles.modalEmail}>Tasks with no staff assignee</Text>
                  </View>
                  {assigneeId === "unassigned" ? (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  ) : null}
                </Pressable>
              }
              ListEmptyComponent={
                <Text style={[styles.emptyText, { padding: 16 }]}>No staff found.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  testID={`todos-staff-option-${item.id}`}
                  style={styles.modalRow}
                  onPress={() => {
                    setAssigneeId(item.id);
                    setAssigneeName(item.name);
                    setStaffModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{item.name}</Text>
                    <Text style={styles.modalEmail}>{item.email}</Text>
                  </View>
                  {assigneeId === item.id ? (
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

function TodoRow({
  todo,
  busy,
  canWrite,
  onComplete,
  onDelete,
  onOpen,
}: {
  todo: Todo;
  busy: boolean;
  canWrite: boolean;
  onComplete: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const overdue =
    todo.status !== "DONE" &&
    todo.dueDate &&
    new Date(todo.dueDate).getTime() < Date.now();

  return (
    <Pressable
      testID={`todo-row-${todo.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Open task ${todo.title}`}
      style={[
        styles.row,
        todo.status === "DONE" ? styles.rowDone : null,
        overdue ? styles.rowOverdue : null,
      ]}
      onPress={onOpen}
    >
      <Pressable
        testID={`todo-complete-${todo.id}`}
        accessibilityRole="button"
        accessibilityLabel={
          todo.status === "DONE" ? "Already completed" : "Mark task complete"
        }
        disabled={!canWrite || busy || todo.status === "DONE"}
        onPress={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        style={[
          styles.checkbox,
          todo.status === "DONE" ? styles.checkboxDone : null,
        ]}
      >
        {todo.status === "DONE" ? (
          <Ionicons name="checkmark" size={14} color="#fff" />
        ) : busy ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : null}
      </Pressable>

      <View style={styles.rowBody}>
        <Text
          style={[
            styles.rowTitle,
            todo.status === "DONE" ? styles.rowTitleDone : null,
          ]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>
        <View style={styles.rowMetaRow}>
          <PriorityPill priority={todo.priority} />
          {todo.dueDate ? (
            <Text style={[styles.dueText, overdue ? styles.dueOverdue : null]}>
              Due {formatDate(todo.dueDate)}
            </Text>
          ) : (
            <Text style={styles.dueTextMuted}>No deadline</Text>
          )}
          {todo.assignedStaff ? (
            <Text style={styles.assignedText} numberOfLines={1}>
              · {todo.assignedStaff.name}
            </Text>
          ) : null}
        </View>
      </View>

      {canWrite ? (
        <Pressable
          testID={`todo-delete-${todo.id}`}
          accessibilityRole="button"
          accessibilityLabel="Delete task"
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function PriorityPill({ priority }: { priority: TodoPriority }) {
  const color =
    priority === "HIGH"
      ? Colors.error
      : priority === "LOW"
      ? Colors.textTertiary
      : Colors.warning;
  return (
    <View style={[styles.priorityPill, { borderColor: color }]}>
      <View style={[styles.priorityDot, { backgroundColor: color }]} />
      <Text style={[styles.priorityPillText, { color }]}>{priority}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  newBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.sm },
  tabsRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  tabActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  tabText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "700" },
  tabTextActive: { color: Colors.primary },
  priorityRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
  },
  priorityChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.full,
  },
  priorityChipActive: {
    backgroundColor: Colors.text,
  },
  priorityChipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "700" },
  priorityChipTextActive: { color: "#fff" },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg },
  centered: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text, marginTop: 6 },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowDone: { opacity: 0.65 },
  rowOverdue: { borderColor: Colors.error },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: Colors.primary },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  rowTitleDone: { textDecorationLine: "line-through", color: Colors.textTertiary },
  rowMetaRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flexWrap: "wrap" },
  priorityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityPillText: { fontSize: FontSize.xs, fontWeight: "800" },
  dueText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "600" },
  dueTextMuted: { fontSize: FontSize.xs, color: Colors.textTertiary, fontStyle: "italic" },
  dueOverdue: { color: Colors.error },
  assignedText: { fontSize: FontSize.xs, color: Colors.textTertiary, flex: 1, maxWidth: 160 },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
  },
  assigneeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    maxWidth: 220,
  },
  assigneeBtnActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  assigneeBtnText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "700",
    flexShrink: 1,
  },
  assigneeBtnTextActive: { color: Colors.primary },
  clearFiltersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  clearFiltersText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.primary },
  emptyResetBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  emptyResetText: { color: "#fff", fontWeight: "800", fontSize: FontSize.sm },
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
