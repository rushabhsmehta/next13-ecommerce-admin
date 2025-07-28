'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, FileText, Download, Trash, Check, X, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TourPackageQuery } from '@prisma/client';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Link from "next/link";
import { formatLocalDate } from "@/lib/timezone-utils";

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
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { AlertModal } from '@/components/modals/alert-modal';

export interface QueryLinkProps {
  query: TourPackageQuery;
  url?: string; // Make url prop optional for backward compatibility
}

export const QueryLink = ({ query, url }: QueryLinkProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/tourPackageQuery/${query.id}`);
      router.refresh();
      toast.success('Tour Package Query deleted.');
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onConfirmQuery = async () => {
    try {
      setLoading(true);
      // Toggle the isFeatured property instead of setting tourPackageQueryType
      await axios.patch(`/api/tourPackageQuery/${query.id}/confirm`, {});
      router.refresh();
      toast.success(query.isFeatured ? 'Tour Package Query unmarked.' : 'Tour Package Query confirmed.');
    } catch (error) {
      toast.error('Failed to update query status.');
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const handleOptionConfirm = (selectedOption: string) => {
    window.open(`/tourPackageQueryDisplay/${query.id}?search=${selectedOption}`, "_blank");
  }

  const handleOptionConfirmPDF = (selectedOption: string) => {
    window.open(`/tourPackageQueryPDFGenerator/${query.id}?search=${selectedOption}`, "_blank");
  }

  const handleOptionConfirmVoucher = (selectedOption: string) => {
    window.open(`/tourPackageQueryVoucherDisplay/${query.id}?search=${selectedOption}`, "_blank");
  }

  // Use the provided URL or fall back to a default URL structure
  const linkUrl = url || `/inquiries/${query.inquiryId}/tourPackage/${query.id}`;

  // Format the display text based on available query data
  const queryName = query.tourPackageQueryName
    ? query.tourPackageQueryName.substring(0, 8) + (query.tourPackageQueryName.length > 8 ? "..." : "")
    : query.tourPackageQueryNumber || `Query #${query.id.substring(0, 8)}`;

  const queryType = query.tourPackageQueryType || "";

  // Use isFeatured to determine if query is confirmed
  const isConfirmed = query.isFeatured;

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirmDelete}
        loading={loading}
      />
      <AlertModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirmQuery}
        loading={loading}
        title={isConfirmed ? "Unmark Query" : "Confirm Query"}
        description={isConfirmed
          ? "Are you sure you want to unmark this query as confirmed?"
          : "Are you sure you want to confirm this query?"}
      />
      <div className="inline-flex items-center">
        <Link
          href={linkUrl}
          className="text-blue-600 hover:text-blue-800 hover:underline flex flex-col"
        >
          <span
            className="font-medium"
            title={query.tourPackageQueryName || query.tourPackageQueryNumber || `Query #${query.id}`}
          >
            {queryName}
          </span>
          {queryType && <span className="text-xs text-gray-600">{queryType}</span>}
          <span className="text-xs text-blue-500 mt-0.5">
            Updated: {formatLocalDate(query.updatedAt, 'dd MMM yyyy HH:mm')}
          </span>
        </Link>
        {isConfirmed && (
          <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            <Star className="mr-1 h-3 w-3" />
            Confirmed
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 ml-1">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Query Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setConfirmOpen(true)}
            >
              {isConfirmed ? (
                <>
                  <X className="mr-2 h-4 w-4" /> Unmark Confirmation
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" /> Confirm Query
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push(`/tourPackageQuery/${query.id}`)}
            >
              <Edit className="mr-2 h-4 w-4" /> Update
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('Empty')}>
                    Empty
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('AH')}>
                    AH
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('KH')}>
                    KH
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('MT')}>
                    MT
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('SupplierA')}>
                    Supplier - Title only
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleOptionConfirmPDF('SupplierB')}>
                    Supplier - with Details
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FileText className="mr-2 h-4 w-4" /> Generate PDF
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
                  <DropdownMenuItem onSelect={() => handleOptionConfirm('SupplierA')}>
                    Supplier - Title only
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleOptionConfirm('SupplierB')}>
                    Supplier - with Details
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FileText className="mr-2 h-4 w-4" /> Generate Voucher
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
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};

