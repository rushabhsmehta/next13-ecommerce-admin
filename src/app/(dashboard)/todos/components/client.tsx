"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { columns, TodoColumn } from "./columns";

interface TodoClientProps {
  data: TodoColumn[];
}

export const TodoClient: React.FC<TodoClientProps> = ({ data }) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Todos (${data.length})`}
          description="Manage your personal task list"
        />
        <Button onClick={() => router.push("/todos/new")}>
          <Plus className="mr-2 h-4 w-4" /> Add Todo
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="title" columns={columns} data={data} />
    </>
  );
};
