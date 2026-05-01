"use client";

import axios from "axios";
import { useState } from "react";
import { CheckSquare, Edit, MoreHorizontal, Trash } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertModal } from "@/components/modals/alert-modal";
import { TodoColumn } from "./columns";

interface CellActionProps {
  data: TodoColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onComplete = async () => {
    try {
      setLoading(true);
      await axios.post(`/api/todos/${data.id}/complete`);
      toast.success("Task marked as complete!");
      router.refresh();
    } catch {
      toast.error("Unable to mark task complete.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/todos/${data.id}`);
      toast.success("Todo deleted.");
      router.refresh();
    } catch {
      toast.error("Unable to delete todo.");
    } finally {
      setDeleteOpen(false);
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {data.status !== "DONE" && (
            <DropdownMenuItem
              onClick={onComplete}
              disabled={loading}
              className="text-green-600 focus:text-green-600"
            >
              <CheckSquare className="mr-2 h-4 w-4" /> Mark Complete
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => router.push(`/todos/${data.id}`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
