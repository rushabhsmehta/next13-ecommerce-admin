'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, FileText, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TourPackageQuery } from '@prisma/client';
import { toast } from 'react-hot-toast';
import axios from 'axios';

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

interface QueryLinkProps {
  query: TourPackageQuery;
}

export const QueryLink = ({ query }: QueryLinkProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleOptionConfirm = (selectedOption: string) => {

    window.open(`/tourPackageQueryDisplay/${query.id}?search=${selectedOption}`, "_blank");
  }

  const handleOptionConfirmPDF = (selectedOption: string) => {

    window.open(`/tourPackageQueryPDFGenerator/${query.id}?search=${selectedOption}`, "_blank");
  }

  const handleOptionConfirmVoucher = (selectedOption: string) => {

    window.open(`/tourPackageQueryVoucherDisplay/${query.id}?search=${selectedOption}`,"_blank");
  }


  return (
    <div className="inline-flex items-center">
      <span className="text-blue-600 hover:underline">
        {query.tourPackageQueryName || `Query #${query.id.substring(0, 6)}`}
      </span>
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

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Edit className="mr-2 h-4 w-4" />  Download PDF
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
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
