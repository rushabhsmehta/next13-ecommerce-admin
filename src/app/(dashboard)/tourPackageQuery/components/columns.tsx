"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"
import { ArrowUpDown, FileText, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export type TourPackageQueryColumn = {
  id: string;
  tourPackageQueryNumber: string;
  customerName: string;
  tourPackageQueryName: string;
  tourPackageQueryType: string;
  assignedTo: string;
  customerNumber: string;
  location: string;
  tourStartsFrom: string;
  updatedAt: string;
  isFeatured: boolean;
  isArchived: boolean;
}

function StatusPill({ confirmed }: { confirmed: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none ${
        confirmed
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800/60"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800/60"
      }`}
    >
      {confirmed ? "Confirmed" : "Pending"}
    </span>
  )
}

function TypePill({ type }: { type: string }) {
  if (!type) return null
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {type}
    </span>
  )
}

export const columns: ColumnDef<TourPackageQueryColumn>[] = [
  {
    accessorKey: "tourPackageQueryNumber",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Query #
        <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-50" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-muted-foreground">
        {row.getValue("tourPackageQueryNumber") || "—"}
      </span>
    ),
  },
  {
    accessorKey: "tourPackageQueryType",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Type
      </span>
    ),
    cell: ({ row }) => <TypePill type={row.getValue("tourPackageQueryType")} />,
  },
  {
    id: "customer",
    accessorKey: "customerName",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Customer
      </span>
    ),
    cell: ({ row }) => {
      const { customerName, customerNumber } = row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground leading-none">
            {customerName || "—"}
          </span>
          {customerNumber && (
            <span className="text-[11px] text-muted-foreground">
              {customerNumber}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "tourPackageQueryName",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Package Name
      </span>
    ),
    cell: ({ row }) => {
      const { id, tourPackageQueryName } = row.original
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={`/tourPackageQuery/${id}`}
            className="truncate text-sm font-medium text-foreground underline-offset-2 transition-colors duration-150 hover:text-primary hover:underline max-w-[220px]"
            title={tourPackageQueryName}
          >
            {tourPackageQueryName || "Untitled"}
          </Link>
          <Link
            href={`/tourPackageQueryDisplay/${id}?search=AH`}
            target="_blank"
            aria-label="Open display view"
            title="Open display view"
            className="shrink-0 rounded-md p-1 text-muted-foreground/50 transition-all duration-150 hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )
    },
  },
  {
    accessorKey: "assignedTo",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Assigned To
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.getValue("assignedTo") || <span className="italic opacity-50">Unassigned</span>}
      </span>
    ),
  },
  {
    accessorKey: "location",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Location
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.getValue("location") || "—"}
      </span>
    ),
  },
  {
    accessorKey: "isFeatured",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-50" />
      </Button>
    ),
    cell: ({ row }) => <StatusPill confirmed={row.getValue("isFeatured")} />,
    enableSorting: true,
  },
  {
    accessorKey: "tourStartsFrom",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Tour Starts
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {row.getValue("tourStartsFrom") || "—"}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Last Updated
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground/70">
        {row.getValue("updatedAt") || "—"}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
]
