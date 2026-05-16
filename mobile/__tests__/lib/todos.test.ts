import { createTodosClient } from "../../lib/todos";

describe("createTodosClient", () => {
  function makeRequest() {
    return jest.fn(async () => ({}) as any);
  }

  it("encodes filters into the list query string", async () => {
    const request = makeRequest();
    const client = createTodosClient(request as any);

    await client.list({
      status: "TODO",
      priority: "HIGH",
      limit: 25,
      offset: 50,
    });

    expect(request).toHaveBeenCalledTimes(1);
    const [endpoint] = request.mock.calls[0];
    expect(endpoint).toMatch(/^\/api\/mobile\/todos\?/);
    expect(endpoint).toContain("status=TODO");
    expect(endpoint).toContain("priority=HIGH");
    expect(endpoint).toContain("limit=25");
    expect(endpoint).toContain("offset=50");
  });

  it("omits the query string when no filters are passed", async () => {
    const request = makeRequest();
    const client = createTodosClient(request as any);
    await client.list();
    const [endpoint] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/todos");
  });

  it("encodes assignee + due date range filters", async () => {
    const request = makeRequest();
    const client = createTodosClient(request as any);

    await client.list({
      assignee: "staff-1",
      dueFrom: "2026-05-01",
      dueTo: "2026-05-31",
    });

    const [endpoint] = request.mock.calls[0];
    expect(endpoint).toContain("assignee=staff-1");
    expect(endpoint).toContain("dueFrom=2026-05-01");
    expect(endpoint).toContain("dueTo=2026-05-31");
  });

  it("supports the 'unassigned' sentinel for the assignee filter", async () => {
    const request = makeRequest();
    const client = createTodosClient(request as any);
    await client.list({ assignee: "unassigned" });
    const [endpoint] = request.mock.calls[0];
    expect(endpoint).toContain("assignee=unassigned");
  });

  it("sends create with POST + body + Idempotency-Key header", async () => {
    const request = makeRequest();
    const client = createTodosClient(request as any);
    await client.create({ title: "Call back", priority: "HIGH" });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/todos");
    expect(opts.method).toBe("POST");
    expect(opts.body).toEqual({ title: "Call back", priority: "HIGH" });
    expect(opts.headers?.["Idempotency-Key"]).toMatch(/^todo-create-/);
  });

  it("create can include assignedToStaffId in body", async () => {
    const request = makeRequest();
    const client = createTodosClient(request as any);
    await client.create({
      title: "T",
      assignedToStaffId: "staff-1",
    });
    const [, opts] = request.mock.calls[0];
    expect(opts.body).toMatchObject({
      title: "T",
      assignedToStaffId: "staff-1",
    });
  });

  it("complete() targets /complete and carries an idempotency key", async () => {
    const request = makeRequest();
    const client = createTodosClient(request as any);
    await client.complete("todo_123");
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/todos/todo_123/complete");
    expect(opts.method).toBe("POST");
    expect(opts.headers?.["Idempotency-Key"]).toMatch(/^todo-complete-todo_123-/);
  });

  it("encodes id segments when calling get / update / delete", async () => {
    const request = makeRequest();
    const client = createTodosClient(request as any);

    await client.get("todo with space");
    await client.update("a/b", { title: "x", assignedToStaffId: null });
    await client.delete("evil id");

    expect(request.mock.calls[0][0]).toBe(
      "/api/mobile/todos/todo%20with%20space"
    );
    expect(request.mock.calls[1][0]).toBe("/api/mobile/todos/a%2Fb");
    expect(request.mock.calls[1][1]?.method).toBe("PATCH");
    expect(request.mock.calls[1][1]?.body).toEqual({
      title: "x",
      assignedToStaffId: null,
    });
    expect(request.mock.calls[2][0]).toBe("/api/mobile/todos/evil%20id");
    expect(request.mock.calls[2][1]?.method).toBe("DELETE");
  });
});
