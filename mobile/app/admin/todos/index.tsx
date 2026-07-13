import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterSheet,
  AdminPickerSheet,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
  AdminTopBarPrimaryButton,
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
import {
  createTodosClient,
  Todo,
  TodoPriority,
  TodoStatusFilter,
} from "@/lib/todos";
import { fetchActiveOperationalStaff } from "@/lib/operational-staff";

type DuePreset = "ANY" | "OVERDUE" | "TODAY" | "WEEK";
type StatusTab = TodoStatusFilter | "ALL";

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

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: "ACTIVE", label: "Active" },
  { id: "TODO", label: "Open" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "DONE", label: "Done" },
  { id: "ALL", label: "All" },
];

const PRIORITY_FILTERS: { id: TodoPriority | "ALL"; label: string }[] = [
  { id: "ALL", label: "Any priority" },
  { id: "HIGH", label: "High" },
  { id: "MEDIUM", label: "Medium" },
  { id: "LOW", label: "Low" },
];

const PAGE_SIZE = 50;

function emptyStateHint(statusFilter: StatusTab): string {
  if (statusFilter === "DONE") return "Completed tasks will appear here.";
  if (statusFilter === "IN_PROGRESS") return "In-progress tasks will appear here.";
  if (statusFilter === "ALL") return "Tasks will appear here when created.";
  if (statusFilter === "TODO") return "Open tasks will appear here.";
  return "Create a task to track follow-ups, calls, and reminders.";
}

function filterExcludesDone(statusFilter: StatusTab): boolean {
  return statusFilter === "ACTIVE" || statusFilter === "TODO" || statusFilter === "IN_PROGRESS";
}

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
  const [statusFilter, setStatusFilter] = useState<StatusTab>("ACTIVE");
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | "ALL">("ALL");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [duePreset, setDuePreset] = useState<DuePreset>("ANY");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      void load("initial");
    }, [authLoading, load])
  );

  const hasActiveFilters =
    priorityFilter !== "ALL" ||
    assigneeId !== null ||
    duePreset !== "ANY";

  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false) ||
        (t.assignedStaff?.name.toLowerCase().includes(q) ?? false)
    );
  }, [items, searchQuery]);

  const staffPickerOptions = useMemo(
    () => [
      { id: "unassigned", label: "Unassigned", subtitle: "Tasks with no staff assignee" },
      ...staffList.map((s) => ({ id: s.id, label: s.name, subtitle: s.email })),
    ],
    [staffList]
  );

  function clearFilters() {
    setStatusFilter("ACTIVE");
    setPriorityFilter("ALL");
    setAssigneeId(null);
    setAssigneeName(null);
    setDuePreset("ANY");
  }

  async function openAssigneePicker() {
    setAssigneePickerOpen(true);
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

  async function completeTodo(todo: Todo) {
    if (todo.status === "DONE" || !canWrite) return;
    setBusyId(todo.id);
    try {
      const updated = await client.complete(todo.id);
      setItems((prev) => {
        if (filterExcludesDone(statusFilter)) {
          return prev.filter((t) => t.id !== updated.id);
        }
        return prev.map((t) => (t.id === updated.id ? updated : t));
      });
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
    <AdminScreen scroll={false} testID="todos-screen">
      <Stack.Screen options={{ title: "Tasks", headerShown: false }} />

      <AdminTopBar
        title="Tasks"
        subtitle={loading ? "Loading…" : `${displayedItems.length} shown`}
        onBackPress={() => router.back()}
        testID="todos-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarPrimaryButton
              label="New"
              icon="add"
              testID="todos-new"
              onPress={() => router.push("/admin/todos/new" as never)}
            />
          ) : null
        }
      />

      <AdminSegmentedControl
        options={STATUS_TABS}
        value={statusFilter}
        onChange={setStatusFilter}
        testIDPrefix="todos-status"
      />

      <AdminCommandBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search tasks"
        searchTestID="todos-search"
        onFilterPress={() => setFilterSheetOpen(true)}
        filterActive={hasActiveFilters}
        filterAccessibilityLabel="Open task filters"
        testID="todos-command-bar"
      />

      {error ? <AdminErrorState message={error} onRetry={() => void load("refresh")} testID="todos-error" /> : null}

      <FlatList
        data={displayedItems}
        keyExtractor={(t) => t.id}
        style={styles.list}
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
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="checkbox-outline"
              title="No tasks"
              body={
                hasActiveFilters || searchQuery.trim()
                  ? "No tasks match these filters. Try widening the search or resetting filters."
                  : emptyStateHint(statusFilter)
              }
              actionLabel={hasActiveFilters || searchQuery.trim() ? "Reset filters" : undefined}
              onActionPress={
                hasActiveFilters || searchQuery.trim()
                  ? () => {
                      clearFilters();
                      setSearchQuery("");
                    }
                  : undefined
              }
              testID="todos-empty"
            />
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

      <AdminFilterSheet
        visible={filterSheetOpen}
        title="Task filters"
        onClose={() => setFilterSheetOpen(false)}
        onReset={clearFilters}
        testID="todos-filter-sheet"
      >
        <Text style={styles.filterLabel}>Priority</Text>
        <View style={styles.chipRow}>
          {PRIORITY_FILTERS.map((p) => {
            const active = priorityFilter === p.id;
            return (
              <Pressable
                key={p.id}
                testID={`todos-priority-${p.id}`}
                accessibilityRole="button"
                accessibilityLabel={p.label}
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setPriorityFilter(p.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.filterLabel}>Due</Text>
        <View style={styles.chipRow}>
          {DUE_FILTERS.map((d) => {
            const active = duePreset === d.id;
            return (
              <Pressable
                key={d.id}
                testID={`todos-due-${d.id}`}
                accessibilityRole="button"
                accessibilityLabel={d.label}
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setDuePreset(d.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.filterLabel}>Assignee</Text>
        <Pressable
          testID="todos-assignee-picker"
          accessibilityRole="button"
          accessibilityLabel="Choose assignee filter"
          style={styles.assigneePickerBtn}
          onPress={() => void openAssigneePicker()}
        >
          <Ionicons name="person-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.assigneePickerText} numberOfLines={1}>
            {assigneeName ?? "Any assignee"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
        </Pressable>
      </AdminFilterSheet>

      <AdminPickerSheet
        visible={assigneePickerOpen}
        title="Assignee"
        options={staffPickerOptions}
        selectedId={assigneeId}
        loading={staffLoading}
        onClose={() => setAssigneePickerOpen(false)}
        onSelect={(opt) => {
          if (opt.id === "unassigned") {
            setAssigneeId("unassigned");
            setAssigneeName("Unassigned");
          } else {
            setAssigneeId(opt.id);
            setAssigneeName(opt.label);
          }
        }}
        testID="todos-assignee-sheet"
      />
    </AdminScreen>
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
      accessibilityHint="Opens task details."
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
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, flexGrow: 1 },
  listLoader: { marginTop: Spacing.xxl },
  filterLabel: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  chipText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textSecondary },
  chipTextActive: { color: Colors.primaryDark },
  assigneePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  assigneePickerText: { flex: 1, fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: -Spacing.lg,
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
