import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { TodoForm } from "./components/todo-form";

const TodoPage = async (props: { params: Promise<{ todoId: string }> }) => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const params = await props.params;

  const staffList = await prismadb.operationalStaff.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (params.todoId === "new") {
    return (
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
          <TodoForm initialData={null} staffList={staffList} />
        </div>
      </div>
    );
  }

  const todo = await prismadb.todoItem.findUnique({
    where: { id: params.todoId },
  });

  if (!todo || todo.userId !== userId) redirect("/todos");

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TodoForm initialData={todo} staffList={staffList} />
      </div>
    </div>
  );
};

export default TodoPage;
