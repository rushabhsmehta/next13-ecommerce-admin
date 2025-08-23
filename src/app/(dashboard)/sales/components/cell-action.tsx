"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Edit, MoreHorizontal, Trash, FileText, ShoppingBasket } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AlertModal } from "@/components/modals/alert-modal";

interface CellActionProps {
  data: {
    id: string;
    customerName: string;
    hasItems: boolean;
  };
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("ID copied to clipboard.");
  setMenuOpen(false);
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/sales/${data.id}`);
      router.refresh();
      toast.success("Sale deleted.");
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
      setOpen(false);
  setMenuOpen(false);
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
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onCopy(data.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setMenuOpen(false); router.push(`/sales/${data.id}`) }}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setMenuOpen(false); router.push(`/sales/${data.id}/items`) }}>
            <ShoppingBasket className="mr-2 h-4 w-4" />
            {data.hasItems ? "Edit Items" : "Add Items"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setMenuOpen(false); router.push(`/sales/${data.id}/voucher`) }}>
            <FileText className="mr-2 h-4 w-4" />
            View Voucher
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => { setMenuOpen(false); router.push(`/sale-returns/new?saleId=${data.id}`) }}
            disabled={!data.hasItems}
          >
            <FileText className="mr-2 h-4 w-4" />
            Create Return
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

