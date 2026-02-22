"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const Pagination = ({ page, pageSize, totalCount, totalPages }: PaginationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updatePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;

    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('page', newPage.toString());
      router.replace(`/inquiries?${params.toString()}`);
    });
  };

  const updatePageSize = (newPageSize: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('pageSize', newPageSize);
      params.set('page', '1'); // Reset to first page when changing page size
      router.replace(`/inquiries?${params.toString()}`);
    });
  };

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 px-2">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={pageSize.toString()}
            onValueChange={updatePageSize}
            disabled={isPending}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {totalCount > 0 ? startItem : 0} to {endItem} of {totalCount} results
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="text-sm font-medium">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => updatePage(1)}
            disabled={page <= 1 || isPending}
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">Go to first page</span>
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => updatePage(page - 1)}
            disabled={page <= 1 || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Go to previous page</span>
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => updatePage(page + 1)}
            disabled={page >= totalPages || isPending}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Go to next page</span>
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => updatePage(totalPages)}
            disabled={page >= totalPages || isPending}
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Go to last page</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
