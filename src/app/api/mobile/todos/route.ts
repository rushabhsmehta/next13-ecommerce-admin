import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().optional(),
  assignedToStaffId: z.string().optional(),
});

async function loadProfile(userId: string) {
  const [membership, inquiryAccess] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  return buildMobileAdminProfile(membership?.role ?? null, inquiryAccess.isAssociate);
}

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const profile = await loadProfile(userId);
    if (!profile.permissions.includes("todos.read")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status");
    const priorityFilter = url.searchParams.get("priority");
    const assigneeFilter = url.searchParams.get("assignee");
    const dueFrom = url.searchParams.get("dueFrom");
    const dueTo = url.searchParams.get("dueTo");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const where: Record<string, unknown> = { userId };
    if (statusFilter && ["TODO", "IN_PROGRESS", "DONE"].includes(statusFilter)) {
      where.status = statusFilter;
    }
    if (priorityFilter && ["LOW", "MEDIUM", "HIGH"].includes(priorityFilter)) {
      where.priority = priorityFilter;
    }
    if (assigneeFilter) {
      where.assignedToStaffId =
        assigneeFilter === "unassigned" ? null : assigneeFilter;
    }
    const dueDateRange: { gte?: Date; lte?: Date } = {};
    if (dueFrom && /^\d{4}-\d{2}-\d{2}$/.test(dueFrom)) {
      const d = new Date(`${dueFrom}T00:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) dueDateRange.gte = d;
    }
    if (dueTo && /^\d{4}-\d{2}-\d{2}$/.test(dueTo)) {
      const d = new Date(`${dueTo}T23:59:59.999Z`);
      if (!Number.isNaN(d.getTime())) dueDateRange.lte = d;
    }
    if (dueDateRange.gte || dueDateRange.lte) {
      where.dueDate = dueDateRange;
    }

    const [todos, total] = await Promise.all([
      prismadb.todoItem.findMany({
        where,
        include: { assignedStaff: { select: { id: true, name: true } } },
        orderBy: [
          { priority: "desc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
        take: limit,
        skip: offset,
      }),
      prismadb.todoItem.count({ where }),
    ]);

    return NextResponse.json({
      todos,
      total,
      hasMore: offset + todos.length < total,
      nextOffset: offset + todos.length,
    });
  } catch (error) {
    console.log("[MOBILE_TODOS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const profile = await loadProfile(userId);
    if (!profile.permissions.includes("todos.write")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid todo payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { title, description, status, priority, dueDate, assignedToStaffId } = parsed.data;

    const todo = await prismadb.todoItem.create({
      data: {
        title,
        description,
        status: status ?? "TODO",
        priority: priority ?? "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        userId,
        assignedToStaffId: assignedToStaffId || null,
      },
      include: { assignedStaff: { select: { id: true, name: true } } },
    });

    if (assignedToStaffId) {
      const staff = await prismadb.operationalStaff.findUnique({
        where: { id: assignedToStaffId },
        select: { name: true },
      });
      if (staff) {
        await prismadb.notification.create({
          data: {
            type: "TODO_ASSIGNED",
            title: "Task Assigned",
            message: `"${title}" has been assigned to ${staff.name}.`,
            data: { todoId: todo.id, staffId: assignedToStaffId, staffName: staff.name },
          },
        });
      }
    }

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_TODOS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
