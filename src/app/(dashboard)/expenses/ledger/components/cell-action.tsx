"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Edit, Copy, MoreHorizontal, Trash } from "lucide-react";
import { toast } from "react-hot-toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  AlertModal
} from "@/components/modals/alert-modal";

interface CellActionProps {
  data: {
    id: string;
    date: string;
    amount: number;
    description: string;
    packageName: string;
    category: string;
    paymentMode: string;
    account: string;
  };
}

export const CellAction: React.FC<CellActionProps> = ({
  data
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/expenses/${data.id}`);
      router.refresh();
      toast.success('Expense deleted.');
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onDuplicate = async () => {
    try {
      setLoading(true);
      
      // Extract the original expense data without the ID
      const { id, ...expenseData } = data;
      
      // Add a note that this is a duplicated expense
      const duplicatedData = {
        ...expenseData,
        description: `${expenseData.description} (Copy)`
      };
      
      await axios.post(`/api/expenses`, duplicatedData);
      router.refresh();
      toast.success('Expense duplicated.');
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onEdit = () => {
    router.push(`/expenses/${data.id}`);
  };

  return (
    <>
      <AlertModal 
        isOpen={open} 
        onClose={() => setOpen(false)}
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
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};