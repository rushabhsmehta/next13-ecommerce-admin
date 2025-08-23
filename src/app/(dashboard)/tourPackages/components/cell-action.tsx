"use client";

import axios from "axios";
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { AlertModal } from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { TourPackageColumn } from "./columns";

interface CellActionProps {
  data: TourPackageColumn;
  readOnly?: boolean;
}

export const CellAction: React.FC<CellActionProps> = ({
  data,
  readOnly = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const params = useParams();

  const onConfirm = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/tourPackages/${data.id}`);
      toast.success('Tour Package deleted.');
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

          {!readOnly && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/tourPackageQueryFromTourPackage/${data.id}`)
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Create New Query
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/tourPackageCreateCopy/${data.id}`)
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Copy and Create New
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuItem
            onClick={() => {
              setMenuOpen(false);
              router.push(`/tourPackages/${data.id}`)
            }}
          >
            <Edit className="mr-2 h-4 w-4" /> {readOnly ? 'View' : 'Update'}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setMenuOpen(false);
              router.push(`/tourPackagePDFGenerator/${data.id}`)
            }}
          >
            <Edit className="mr-2 h-4 w-4" /> Download PDF
          </DropdownMenuItem>
          
          {!readOnly && (
            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                router.push(`/tourPackages/${data.id}/pricing`)
              }}
            >
              <Edit className="mr-2 h-4 w-4" /> Manage Seasonal Pricing
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => {
              setMenuOpen(false);
              router.push(`/tourPackageDisplay/${data.id}`)
            }}
          >
            <Edit className="mr-2 h-4 w-4" /> Generate PDF
          </DropdownMenuItem>

          {!readOnly && (
            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                setOpen(true);
              }}
            >
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

