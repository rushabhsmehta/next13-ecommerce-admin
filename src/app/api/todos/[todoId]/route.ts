import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  props: { params: Promise<{ todoId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const { todoId } = await props.params;

    const todo = await prismadb.todoItem.findUnique({
      where: { id: todoId },
    });
    if (!todo) return new NextResponse("Not found", { status: 404 });
    if (todo.userId !== userId) return new NextResponse("Forbidden", { status: 403 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return new NextResponse(parsed.error.errors[0].message, { status: 400 });
    }

    const { title, description, status, priority, dueDate } = parsed.data;

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
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.log("[TODO_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ todoId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const { todoId } = await props.params;

    const todo = await prismadb.todoItem.findUnique({
      where: { id: todoId },
    });
    if (!todo) return new NextResponse("Not found", { status: 404 });
    if (todo.userId !== userId) return new NextResponse("Forbidden", { status: 403 });

    const deleted = await prismadb.todoItem.delete({
      where: { id: todoId },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    console.log("[TODO_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
