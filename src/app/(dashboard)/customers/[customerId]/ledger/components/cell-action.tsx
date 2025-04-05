"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, FileText, MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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

  const onEdit = () => {
    // Route to the appropriate edit page based on transaction type
    if (data.type === "SALE") {
      router.push(`/sales/${data.id}`);
    } else if (data.type === "RECEIPT") {
      router.push(`/receipts/${data.id}`);
    }
  };

  const onViewVoucher = () => {
    // Route to the appropriate voucher page based on transaction type
    if (data.type === "SALE") {
      router.push(`/sales/${data.id}/voucher`);
    } else if (data.type === "RECEIPT") {
      router.push(`/receipts/${data.id}/voucher`);
    }
  };

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};