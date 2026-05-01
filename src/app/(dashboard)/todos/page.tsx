import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { TodoClient } from "./components/client";
import { TodoColumn } from "./components/columns";

export default async function TodosPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const todos = await prismadb.todoItem.findMany({
    where: { userId },
    include: { assignedStaff: { select: { name: true } } },
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  const now = new Date();

  const formatted: TodoColumn[] = todos.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: t.status as TodoColumn["status"],
    priority: t.priority as TodoColumn["priority"],
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    isOverdue: t.dueDate ? t.dueDate < now && t.status !== "DONE" : false,
    assignedToStaffName: t.assignedStaff?.name ?? null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    completedByName: t.completedByName ?? null,
    createdAt: t.createdAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TodoClient data={formatted} />
      </div>
    </div>
  );
}
