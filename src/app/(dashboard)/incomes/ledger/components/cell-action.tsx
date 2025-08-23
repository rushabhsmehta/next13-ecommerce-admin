"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Edit, Copy, MoreHorizontal, Trash, Eye } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/incomes/${data.id}`);
      router.refresh();
      toast.success('Income deleted.');
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
  setMenuOpen(false);
    }
  };

  const onDuplicate = async () => {
    try {
      setLoading(true);
      
      // Extract the original income data without the ID
      const { id, ...incomeData } = data;
      
      // Add a note that this is a duplicated income
      const duplicatedData = {
        ...incomeData,
        description: `${incomeData.description} (Copy)`
      };
      
      await axios.post(`/api/incomes`, duplicatedData);
      router.refresh();
      toast.success('Income duplicated.');
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onEdit = () => {
  setMenuOpen(false);
  router.push(`/incomes/${data.id}`);
  };

  const onView = () => {
  setMenuOpen(false);
  router.push(`/incomes/${data.id}/view`);
  };

  return (
    <>
      <AlertModal 
        isOpen={open} 
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={onView}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
      <DropdownMenuItem onClick={() => { setMenuOpen(false); setOpen(true); }}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
};