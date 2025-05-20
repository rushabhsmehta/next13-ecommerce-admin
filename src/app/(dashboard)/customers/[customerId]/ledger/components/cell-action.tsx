"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, FileText, MoreHorizontal, Trash } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AlertModal } from "@/components/modals/alert-modal";

interface CellActionProps {
  data: {
    id: string;
    type: string;
    reference?: string;
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
      
      // Delete appropriate record based on transaction type
      if (data.type === "SALE") {
        await axios.delete(`/api/sales/${data.id}`);
        toast.success('Sale deleted.');
      } else if (data.type === "RECEIPT") {
        await axios.delete(`/api/receipts/${data.id}`);
        toast.success('Receipt deleted.');
      } else if (data.type === "Sale Return") {
        await axios.delete(`/api/sale-returns/${data.id}`);
        toast.success('Sale return deleted.');
      }
      
      router.refresh();
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onEdit = () => {
    // Route to the appropriate edit page based on transaction type
    if (data.type === "SALE") {
      router.push(`/sales/${data.id}`);
    } else if (data.type === "RECEIPT") {
      router.push(`/receipts/${data.id}`);
    } else if (data.type === "Sale Return") {
      router.push(`/sale-returns/${data.id}`);
    }
  };

  const onViewVoucher = () => {
    // Route to the appropriate voucher page based on transaction type
    if (data.type === "SALE") {
      router.push(`/sales/${data.id}/voucher`);
    } else if (data.type === "RECEIPT") {
      router.push(`/receipts/${data.id}/voucher`);
    } else if (data.type === "Sale Return") {
      router.push(`/sale-returns/${data.id}/voucher`);
    }
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
          <DropdownMenuItem onClick={onViewVoucher}>
            <FileText className="mr-2 h-4 w-4" />
            View Voucher
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