/**
 * Typed client for the mobile todos API at /api/mobile/todos.
 *
 * Conforms to Phase 1 / Phase F rules:
 * - All writes are non-retryable (the underlying api.ts already enforces this).
 * - Idempotency keys are passed on create/complete so a flaky network can't
 *   produce duplicate todos.
 * - Module is `draft_only` (per mobile-admin-access.ts), so we don't add the
 *   `requireOnline` flag here — screens can buffer drafts locally.
 * - Optional `assignedToStaffId` on create/update (operational staff picker).
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export type TodoStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TodoPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate: string | null;
  userId: string;
  assignedToStaffId: string | null;
  assignedStaff: { id: string; name: string } | null;
  completedAt: string | null;
  completedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodoListResponse {
  todos: Todo[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface TodoListFilters {
  status?: TodoStatus;
  priority?: TodoPriority;
  /**
   * Operational staff id, or the literal "unassigned" to match todos with no
   * assignee. Server treats anything else as a staff-id equality filter.
   */
  assignee?: string;
  /** ISO date YYYY-MM-DD; inclusive lower bound on dueDate. */
  dueFrom?: string;
  /** ISO date YYYY-MM-DD; inclusive upper bound on dueDate. */
  dueTo?: string;
  limit?: number;
  offset?: number;
}

export interface TodoCreateInput {
  title: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: string;
  assignedToStaffId?: string;
}

export type TodoUpdateInput = Partial<{
  title: string;
  description: string;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate: string | null;
  assignedToStaffId: string | null;
}>;

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function createTodosClient(authRequest: AuthenticatedRequest) {
  return {
    list(filters: TodoListFilters = {}): Promise<TodoListResponse> {
      const qs = new URLSearchParams();
      if (filters.status) qs.set("status", filters.status);
      if (filters.priority) qs.set("priority", filters.priority);
      if (filters.assignee) qs.set("assignee", filters.assignee);
      if (filters.dueFrom) qs.set("dueFrom", filters.dueFrom);
      if (filters.dueTo) qs.set("dueTo", filters.dueTo);
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest<TodoListResponse>(
        `/api/mobile/todos${q ? `?${q}` : ""}`
      );
    },

    get(id: string): Promise<Todo> {
      return authRequest<Todo>(`/api/mobile/todos/${encodeURIComponent(id)}`);
    },

    create(input: TodoCreateInput): Promise<Todo> {
      return authRequest<Todo>("/api/mobile/todos", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("todo-create") },
      });
    },

    update(id: string, input: TodoUpdateInput): Promise<Todo> {
      return authRequest<Todo>(`/api/mobile/todos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: input,
      });
    },

    complete(id: string): Promise<Todo> {
      return authRequest<Todo>(
        `/api/mobile/todos/${encodeURIComponent(id)}/complete`,
        {
          method: "POST",
          body: {},
          headers: { "Idempotency-Key": makeIdempotencyKey(`todo-complete-${id}`) },
        }
      );
    },

    delete(id: string): Promise<Todo> {
      return authRequest<Todo>(`/api/mobile/todos/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };
}

export type TodosClient = ReturnType<typeof createTodosClient>;
