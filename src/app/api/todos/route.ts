import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().optional(),
  assignedToStaffId: z.string().optional(),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const todos = await prismadb.todoItem.findMany({
      where: { userId },
      include: { assignedStaff: { select: { name: true } } },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(todos);
  } catch (error) {
    console.log("[TODOS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return new NextResponse(parsed.error.errors[0].message, { status: 400 });
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

    return NextResponse.json(todo);
  } catch (error) {
    console.log("[TODOS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
