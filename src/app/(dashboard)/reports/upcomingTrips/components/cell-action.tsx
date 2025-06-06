"use client";

import axios from "axios";
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { AlertModal } from "@/components/modals/alert-modal";
import { OptionModal } from "@/components/modals/option-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { TourPackageQueryColumn } from "./columns";

interface CellActionProps {
  data: TourPackageQueryColumn;
}

export const CellAction: React.FC<CellActionProps> = ({
  data,
}) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const params = useParams();

  const onConfirm = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/tourPackageQuery/${data.id}`);
      toast.success('Tour Package Query deleted.');
      router.refresh();
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Tour Package ID copied to clipboard.');
  }

  const handleOptionConfirm = (selectedOption: string) => {

    router.push(`/tourPackageQueryDisplay/${data.id}?search=${selectedOption}`);
  }


  const handleOptionConfirmVoucher = (selectedOption: string) => {

    router.push(`/tourPackageQueryVoucherDisplay/${data.id}?search=${selectedOption}`);
  }


  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
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
          <DropdownMenuItem
            onClick={() => onCopy(data.id)}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy Id
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/tourPackageQueryCreateCopy/${data.id}`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Copy and Create New
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/tourPackageQuery/${data.id}`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Update
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push(`/tourPackageFromTourPackageQuery/${data.id}`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Create Tour Package
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Edit className="mr-2 h-4 w-4" />  Accounts
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuItem onSelect={() => router.push(`/accounts/${data.id}`)}>
                  Make Entries
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/fetchaccounts/${data.id}`)}>
                  Display Details
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Edit className="mr-2 h-4 w-4" />  Generate PDF
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuItem onSelect={() => handleOptionConfirm('Empty')}>
                  Empty
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirm('AH')}>
                  AH
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirm('KH')}>
                  KH
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirm('MT')}>
                  MT
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />


          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Edit className="mr-2 h-4 w-4" />  Generate Voucher
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuItem onSelect={() => handleOptionConfirmVoucher('Empty')}>
                  Empty
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirmVoucher('AH')}>
                  AH
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirmVoucher('KH')}>
                  KH
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirmVoucher('MT')}>
                  MT
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirmVoucher('Supplier')}>
                  Supplier
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />


          <DropdownMenuItem
            onClick={() => setOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

