"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  MoreHorizontal,
  Edit,
  Trash,
  Receipt
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";

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
      await axios.delete(`/api/sales/${data.id}`);
      router.refresh();
      toast.success("Sale deleted.");
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
      setOpen(false);
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
          <DropdownMenuItem onClick={() => router.push(`/sales/${data.id}`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/sales/${data.id}/voucher`)}>
            <Receipt className="mr-2 h-4 w-4" />
            Generate Voucher
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
