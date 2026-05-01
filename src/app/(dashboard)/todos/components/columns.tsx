"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Circle, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { CellAction } from "./cell-action";

export type TodoColumn = {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
  isOverdue: boolean;
  createdAt: string;
};

const STATUS_CYCLE: Record<TodoColumn["status"], TodoColumn["status"]> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
};

const StatusCell = ({ row }: { row: { original: TodoColumn } }) => {
  const router = useRouter();
  const [status, setStatus] = useState(row.original.status);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    const next = STATUS_CYCLE[status];
    setStatus(next);
    setLoading(true);
    try {
      await axios.patch(`/api/todos/${row.original.id}`, { status: next });
      router.refresh();
    } catch {
      setStatus(status);
      toast.error("Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "DONE")
    return (
      <button onClick={handleClick} title="Done — click to reset" className="text-green-500 hover:opacity-70 transition-opacity">
        <CheckCircle2 className="h-5 w-5" />
      </button>
    );
  if (status === "IN_PROGRESS")
    return (
      <button onClick={handleClick} title="In Progress — click to mark Done" className="text-amber-500 hover:opacity-70 transition-opacity">
        <Clock className="h-5 w-5" />
      </button>
    );
  return (
    <button onClick={handleClick} title="To Do — click to start" className="text-muted-foreground hover:opacity-70 transition-opacity">
      <Circle className="h-5 w-5" />
    </button>
  );
};

const PRIORITY_VARIANT: Record<
  TodoColumn["priority"],
  "destructive" | "secondary" | "outline"
> = {
  HIGH: "destructive",
  MEDIUM: "outline",
  LOW: "secondary",
};

export const columns: ColumnDef<TodoColumn>[] = [
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell row={row} />,
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className={row.original.status === "DONE" ? "line-through text-muted-foreground" : ""}>
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <Badge variant={PRIORITY_VARIANT[row.original.priority]}>
        {row.original.priority}
      </Badge>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const { dueDate, isOverdue } = row.original;
      if (!dueDate) return <span className="text-muted-foreground">—</span>;
      const formatted = new Date(dueDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return isOverdue ? (
        <span className="text-red-500 font-medium">{formatted} · Overdue</span>
      ) : (
        <span>{formatted}</span>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Notes",
    cell: ({ row }) => {
      const desc = row.original.description;
      if (!desc) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-muted-foreground text-sm">
          {desc.length > 60 ? desc.slice(0, 60) + "…" : desc}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
