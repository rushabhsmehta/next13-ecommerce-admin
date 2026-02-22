"use client";

import axios from "axios";
import { Copy, Edit, MoreHorizontal, Trash, FileText, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { AlertModal } from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
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
  const [menuOpen, setMenuOpen] = useState(false);

  const router = useRouter();

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
      setMenuOpen(false);
    }
  };

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Tour Package ID copied to clipboard.');
    setMenuOpen(false);
  }

  const openDisplay = () => {
    setMenuOpen(false);
    window.open(`/tourPackageQueryDisplay/${data.id}?search=AH`, "_blank");
  };

  const openPdf = () => {
    setMenuOpen(false);
    window.open(`/tourPackageQueryPDFGenerator/${data.id}?search=AH`, "_blank");
  };

  const openPdfWithVariants = () => {
    setMenuOpen(false);
    window.open(`/tourPackageQueryPDFGeneratorWithVariants/${data.id}?search=AH`, "_blank");
  };


  const openVoucher = () => {
    setMenuOpen(false);
    window.open(`/tourPackageQueryVoucherDisplay/${data.id}?search=AH`, "_blank");
  };

  const handleOptionConfirmVariantDisplay = (selectedOption: string) => {
    setMenuOpen(false);
    window.open(`/tourPackageQueryVariantDisplay/${data.id}?search=${selectedOption}`, "_blank");
  }


  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
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
          <DropdownMenuItem
            onClick={() => onCopy(data.id)}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy Id
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => { setMenuOpen(false); router.push(`/tourPackageQueryCreateCopy/${data.id}`) }}
          >
            <Edit className="mr-2 h-4 w-4" /> Copy and Create New
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => { setMenuOpen(false); router.push(`/tourPackageQuery/${data.id}`) }}
          >
            <Edit className="mr-2 h-4 w-4" /> Update
          </DropdownMenuItem>

          {/* Hotel details editing now integrated inside main edit form (Hotels tab) */}

          <DropdownMenuItem
            onClick={() => { setMenuOpen(false); router.push(`/tourPackageFromTourPackageQuery/${data.id}`) }}
          >
            <Edit className="mr-2 h-4 w-4" /> Create Tour Package
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={openPdf}>
            <Edit className="mr-2 h-4 w-4" /> Download PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={openPdfWithVariants}>
            <FileText className="mr-2 h-4 w-4" /> Download PDF with Variants
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Layers className="mr-2 h-4 w-4" /> Variant Display
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuItem onSelect={() => handleOptionConfirmVariantDisplay('Empty')}>
                  Empty
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirmVariantDisplay('AH')}>
                  AH
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirmVariantDisplay('KH')}>
                  KH
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirmVariantDisplay('MT')}>
                  MT
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirmVariantDisplay('SupplierA')}>
                  Supplier - Title only
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleOptionConfirmVariantDisplay('SupplierB')}>
                  Supplier - with Details
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={openDisplay}>
            <Edit className="mr-2 h-4 w-4" /> Generate PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={openVoucher}>
            <Edit className="mr-2 h-4 w-4" /> Generate Voucher
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => { setMenuOpen(false); setOpen(true); }}
          >
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

