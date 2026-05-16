import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().nullable().optional(),
  assignedToStaffId: z.string().nullable().optional(),
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

export async function GET(
  req: Request,
  props: { params: Promise<{ todoId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const profile = await loadProfile(userId);
    if (!profile.permissions.includes("todos.read")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { todoId } = await props.params;
    const todo = await prismadb.todoItem.findUnique({
      where: { id: todoId },
      include: { assignedStaff: { select: { id: true, name: true } } },
    });
    if (!todo) return new NextResponse("Not found", { status: 404 });
    if (todo.userId !== userId) return new NextResponse("Forbidden", { status: 403 });

    return NextResponse.json(todo);
  } catch (error) {
    console.log("[MOBILE_TODO_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ todoId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const profile = await loadProfile(userId);
    if (!profile.permissions.includes("todos.write")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { todoId } = await props.params;
    const existing = await prismadb.todoItem.findUnique({ where: { id: todoId } });
    if (!existing) return new NextResponse("Not found", { status: 404 });
    if (existing.userId !== userId) return new NextResponse("Forbidden", { status: 403 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid todo payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { title, description, status, priority, dueDate, assignedToStaffId } = parsed.data;

    const updated = await prismadb.todoItem.update({
      where: { id: todoId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(assignedToStaffId !== undefined && {
          assignedToStaffId: assignedToStaffId || null,
        }),
      },
      include: { assignedStaff: { select: { id: true, name: true } } },
    });

    const wasUnassigned = !existing.assignedToStaffId;
    const isNowAssigned = !!assignedToStaffId;
    if (wasUnassigned && isNowAssigned) {
      const staff = await prismadb.operationalStaff.findUnique({
        where: { id: assignedToStaffId! },
        select: { name: true },
      });
      if (staff) {
        await prismadb.notification.create({
          data: {
            type: "TODO_ASSIGNED",
            title: "Task Assigned",
            message: `"${updated.title}" has been assigned to ${staff.name}.`,
            data: { todoId, staffId: assignedToStaffId, staffName: staff.name },
          },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.log("[MOBILE_TODO_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ todoId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const profile = await loadProfile(userId);
    if (!profile.permissions.includes("todos.write")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { todoId } = await props.params;
    const existing = await prismadb.todoItem.findUnique({ where: { id: todoId } });
    if (!existing) return new NextResponse("Not found", { status: 404 });
    if (existing.userId !== userId) return new NextResponse("Forbidden", { status: 403 });

    const deleted = await prismadb.todoItem.delete({ where: { id: todoId } });
    return NextResponse.json(deleted);
  } catch (error) {
    console.log("[MOBILE_TODO_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
