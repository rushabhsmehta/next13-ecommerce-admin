"use client";

import { Plus, Sparkles, MapPin, Calendar, User, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { columns, TourPackageQueryColumn } from "./columns";
import { DataTableMultiple } from "@/components/ui/data-tableMultiple";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { CellAction } from "./cell-action";
import Link from "next/link";

type QueryStatusFilter = "all" | "confirmed" | "pending";

interface TourPackageQueryClientProps {
  data: TourPackageQueryColumn[];
  assignees: string[];
  filters: {
    search: string;
    assignedTo: string;
    status: QueryStatusFilter;
  };
  counts: {
    total: number;
    confirmed: number;
    pending: number;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export const TourPackageQueryClient: React.FC<TourPackageQueryClientProps> = ({
  data,
  assignees,
  filters,
  counts,
  pagination,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(filters.search);

  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  const updateQueryParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("page", "1");

      Object.entries(updates).forEach(([key, value]) => {
        const normalized = value?.trim() ?? "";
        if (!normalized || normalized === "all") {
          params.delete(key);
        } else {
          params.set(key, normalized);
        }
      });

      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchValue.trim();
      if (nextSearch !== filters.search) {
        updateQueryParams({ search: nextSearch });
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [filters.search, searchValue, updateQueryParams]);

  const handleAssigneeChange = (value: string) => {
    updateQueryParams({
      assignedTo: value,
      search: searchValue.trim(),
    });
  };

  const handleStatusChange = (value: string) => {
    const nextStatus: QueryStatusFilter =
      value === "confirmed" || value === "pending" ? value : "all";

    updateQueryParams({
      status: nextStatus,
      search: searchValue.trim(),
    });
  };

  const clearFilters = () => {
    setSearchValue("");
    updateQueryParams({
      search: null,
      assignedTo: null,
      status: null,
    });
  };

  const hasActiveFilters =
    Boolean(searchValue.trim()) ||
    filters.assignedTo !== "all" ||
    filters.status !== "all";

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            CRM
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Tour Package Queries
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.total} total &middot; {counts.confirmed} confirmed &middot;{" "}
            {counts.pending} pending
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => router.push(`/tourPackageQuery/auto`)}
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-1.5 rounded-full border-border/60 bg-background/60 backdrop-blur-sm transition-all duration-200 hover:border-border hover:bg-background"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Smart Build
          </Button>
          <Button
            onClick={() => router.push(`/tourPackageQuery/new`)}
            size="sm"
            className="rounded-full transition-all duration-200 hover:scale-[1.03]"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Query
          </Button>
        </div>
      </div>

      {/* ── Glassmorphic Filter Bar ────────────────────────── */}
      <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-md p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.assignedTo} onValueChange={handleAssigneeChange}>
            <SelectTrigger className="h-8 w-auto min-w-[160px] rounded-full border-border/50 bg-transparent text-xs transition-all duration-200 hover:bg-muted/30">
              <SelectValue placeholder="All Assignments" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Assignments</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a} value={a}>
                  {a || "Unassigned"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] rounded-full border-border/50 bg-transparent text-xs transition-all duration-200 hover:bg-muted/30">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          {/* Mobile search */}
          <div className="relative flex-1 min-w-[180px] md:hidden">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search queries…"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8 rounded-full pl-8 text-xs border-border/50 bg-transparent"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline transition-all duration-150 ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile Card Grid (hidden on md+) ──────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 md:hidden">
        {data.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
            No queries found.
          </p>
        ) : (
          data.map((item, i) => (
            <MobileQueryCard key={item.id} item={item} index={i} />
          ))
        )}
      </div>

      {/* ── Desktop Table (hidden on mobile) ──────────────── */}
      <div className="hidden md:block">
        <Separator className="mb-4 opacity-50" />
        <DataTableMultiple
          searchKeys={[
            "tourPackageQueryNumber",
            "customerNumber",
            "customerName",
            "tourPackageQueryName",
            "assignedTo",
          ]}
          columns={columns}
          data={data}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search queries..."
          manualFiltering
          showPagination={!pagination}
        />
      </div>

      {pagination && (
        <PaginationControls
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          totalPages={pagination.totalPages}
        />
      )}
    </div>
  );
};

/* ── Mobile Query Card ──────────────────────────────────── */
function MobileQueryCard({
  item,
  index,
}: {
  item: TourPackageQueryColumn;
  index: number;
}) {
  return (
    <div
      className="group relative flex flex-col gap-3 rounded-2xl border border-border/40 bg-background/70 backdrop-blur-sm p-4 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md animate-in fade-in-0 slide-in-from-bottom-3"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            #{item.tourPackageQueryNumber}
          </span>
          <Link
            href={`/tourPackageQuery/${item.id}`}
            className="text-sm font-semibold text-foreground leading-snug hover:text-primary transition-colors duration-150 line-clamp-2"
          >
            {item.tourPackageQueryName || "Untitled Query"}
          </Link>
        </div>
        <StatusBadge
          confirmed={item.isFeatured}
          variantId={item.confirmedVariantId}
          snapshots={item.queryVariantSnapshots}
          customVariants={item.customQueryVariants}
        />
      </div>

      <Separator className="opacity-30" />

      {/* Meta row */}
      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate font-medium text-foreground/80">
            {item.customerName || "—"}
          </span>
          {item.customerNumber && (
            <span className="text-muted-foreground/60">· {item.customerNumber}</span>
          )}
        </span>

        {item.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {item.location}
          </span>
        )}

        {item.tourStartsFrom && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" />
            {item.tourStartsFrom}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[10px] text-muted-foreground/60">
          Updated {item.updatedAt}
        </span>
        <CellAction data={item} />
      </div>
    </div>
  );
}

function StatusBadge({
  confirmed,
  variantId,
  snapshots,
  customVariants
}: {
  confirmed: boolean;
  variantId?: string | null;
  snapshots?: any[];
  customVariants?: any[];
}) {
  let variantName = "";
  if (confirmed && variantId) {
    const snapshot = snapshots?.find(s => s.id === variantId || s.sourceVariantId === variantId);
    if (snapshot) {
      variantName = snapshot.name;
    } else {
      const custom = customVariants?.find(cv => cv.id === variantId);
      if (custom) {
        variantName = custom.name;
      } else {
        variantName = `ID: ${variantId.substring(0, 8)}`;
      }
    }
  }

  return (
    <div className="flex flex-col gap-1 items-end">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${confirmed
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800/60"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800/60"
          }`}
      >
        {confirmed ? "Confirmed" : "Pending"}
      </span>
      {variantName && (
        <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
          {variantName}
        </span>
      )}
    </div>
  );
}
