import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function POST(
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

    const user = await currentUser();
    const displayName =
      user?.fullName ||
      user?.firstName ||
      user?.emailAddresses[0]?.emailAddress ||
      "Unknown";

    const updated = await prismadb.todoItem.update({
      where: { id: todoId },
      data: {
        status: "DONE",
        completedAt: new Date(),
        completedByName: displayName,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.log("[TODO_COMPLETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
