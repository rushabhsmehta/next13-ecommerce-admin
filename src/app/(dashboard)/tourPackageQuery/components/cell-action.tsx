"use client";

import axios from "axios";
import {
  Copy,
  Pencil,
  Ellipsis,
  Trash2,
  FileDown,
  ExternalLink,
  Layers,
  FileText,
  PlusSquare,
  Ticket,
} from "lucide-react";
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
} from "@/components/ui/dropdown-menu";

import { TourPackageQueryColumn } from "./columns";

interface CellActionProps {
  data: TourPackageQueryColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const router = useRouter();

  const close = () => setMenuOpen(false);

  const onConfirm = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/tourPackageQuery/${data.id}`);
      toast.success("Tour Package Query deleted.");
      router.refresh();
    } catch {
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
        onConfirm={onConfirm}
        loading={loading}
      />

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
          >
            <span className="sr-only">Open actions</span>
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-52 rounded-xl border-border/50 bg-background/90 backdrop-blur-md shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* ── Edit ────────────────────── */}
          <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-1.5">
            Edit
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => { close(); router.push(`/tourPackageQuery/${data.id}`); }}
            className="gap-2 rounded-lg text-sm"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            Update Query
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => { close(); router.push(`/tourPackageQueryCreateCopy/${data.id}`); }}
            className="gap-2 rounded-lg text-sm"
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            Copy &amp; Create New
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => { close(); router.push(`/tourPackageFromTourPackageQuery/${data.id}`); }}
            className="gap-2 rounded-lg text-sm"
          >
            <PlusSquare className="h-3.5 w-3.5 text-muted-foreground" />
            Create Tour Package
          </DropdownMenuItem>

          <DropdownMenuSeparator className="opacity-50" />

          {/* ── View / Export ───────────── */}
          <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-1.5">
            Export
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => { close(); window.open(`/tourPackageQueryPDFGenerator/${data.id}?search=AH`, "_blank"); }}
            className="gap-2 rounded-lg text-sm"
          >
            <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => { close(); window.open(`/tourPackageQueryDisplay/${data.id}?search=AH`, "_blank"); }}
            className="gap-2 rounded-lg text-sm"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            Generate PDF View
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => { close(); window.open(`/tourPackageQueryVoucherDisplay/${data.id}?search=AH`, "_blank"); }}
            className="gap-2 rounded-lg text-sm"
          >
            <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
            Generate Voucher
          </DropdownMenuItem>

          <DropdownMenuSeparator className="opacity-50" />

          {/* ── Variants ────────────────── */}
          <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-1.5">
            Variants
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => { close(); window.open(`/tourPackageQueryVariantDisplay/${data.id}?search=AH`, "_blank"); }}
            className="gap-2 rounded-lg text-sm"
          >
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            Variant Display
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => { close(); window.open(`/tourPackageQueryPDFGeneratorWithVariants/${data.id}?search=AH`, "_blank"); }}
            className="gap-2 rounded-lg text-sm"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Variant PDF
          </DropdownMenuItem>

          <DropdownMenuSeparator className="opacity-50" />

          {/* ── Danger ──────────────────── */}
          <DropdownMenuItem
            onClick={() => { close(); setOpen(true); }}
            className="gap-2 rounded-lg text-sm text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Query
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
