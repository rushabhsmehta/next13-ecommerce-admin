"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface PaginationControlsProps {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    baseUrl?: string; // Optional: if we want to override the base URL, otherwise uses current path
}

export const PaginationControls = ({
    page,
    pageSize,
    totalCount,
    totalPages,
    baseUrl
}: PaginationControlsProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Helper to construct URL with updated params
    const createUrl = (newPage: number, newPageSize: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        params.set('pageSize', newPageSize.toString());

        // If baseUrl is provided use it, otherwise we just push the query params
        // Note: In Next.js app directory, pushing just the search params to the current route works well
        return `?${params.toString()}`;
    };

    const updatePage = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;

        startTransition(() => {
            router.push(createUrl(newPage, pageSize));
        });
    };

    const updatePageSize = (newPageSize: string) => {
        const size = parseInt(newPageSize);
        startTransition(() => {
            // Reset to page 1 when changing page size
            router.push(createUrl(1, size));
        });
    };

    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalCount);

    if (totalCount === 0) return null;

    return (
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 px-2 py-4">
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={updatePageSize}
                        disabled={isPending}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={pageSize.toString()} />
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
                    Showing {startItem} to {endItem} of {totalCount} results
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
