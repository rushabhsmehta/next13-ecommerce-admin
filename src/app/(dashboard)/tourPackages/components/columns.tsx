"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { CellAction } from "./cell-action"
import { EditableSelectCell, EditableInputCell } from "./editable-cells"

export type TourPackageColumn = {
  id: string
  tourPackageName: string;
  tourPackageType: string;
  tourCategory: string;
  price: string;
  location : string;
  duration: string;
  //hotel : string;
  createdAt: string;
  updatedAt : string;
  isFeatured: boolean;
  isArchived: boolean;
}

// Predefined options for dropdowns
const TOUR_CATEGORIES = ["Domestic", "International"];
const TOUR_PACKAGE_TYPES = ["Luxury", "Premium", "Deluxe", "Standard", "Budget"];

export const columns: ColumnDef<TourPackageColumn>[] = [
  {
    accessorKey: "location",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-gray-100"
        >
          Location
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("location")}</div>
    },
  },
  {
    accessorKey: "tourPackageName",
    header: "Tour Package Name",
  },
  {
    accessorKey: "tourPackageType",
    header: "Type",
    cell: ({ row }) => (
      <EditableSelectCell
        value={row.original.tourPackageType || ""}
        tourPackageId={row.original.id}
        field="tourPackageType"
        options={TOUR_PACKAGE_TYPES}
      />
    ),
  },
  {
    accessorKey: "tourCategory",
    header: "Category",
    cell: ({ row }) => (
      <EditableSelectCell
        value={row.original.tourCategory || "Domestic"}
        tourPackageId={row.original.id}
        field="tourCategory"
        options={TOUR_CATEGORIES}
      />
    ),
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => (
      <EditableInputCell
        value={row.original.duration || ""}
        tourPackageId={row.original.id}
        field="numDaysNight"
      />
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created Date",
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-gray-100"
        >
          Updated Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("updatedAt")}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];

export const createColumns = (readOnly: boolean = false): ColumnDef<TourPackageColumn>[] => [
  {
    accessorKey: "location",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-gray-100"
        >
          Location
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("location")}</div>
    },
  },
  {
    accessorKey: "tourPackageName",
    header: "Tour Package Name",
  },
  {
    accessorKey: "tourPackageType",
    header: "Type",
    cell: ({ row }) => readOnly ? (
      <span>{row.original.tourPackageType || "Not specified"}</span>
    ) : (
      <EditableSelectCell
        value={row.original.tourPackageType || ""}
        tourPackageId={row.original.id}
        field="tourPackageType"
        options={TOUR_PACKAGE_TYPES}
      />
    ),
  },
  {
    accessorKey: "tourCategory",
    header: "Category",
    cell: ({ row }) => readOnly ? (
      <span>{row.original.tourCategory || "Domestic"}</span>
    ) : (
      <EditableSelectCell
        value={row.original.tourCategory || "Domestic"}
        tourPackageId={row.original.id}
        field="tourCategory"
        options={TOUR_CATEGORIES}
      />
    ),
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => readOnly ? (
      <span>{row.original.duration || "Not specified"}</span>
    ) : (
      <EditableInputCell
        value={row.original.duration || ""}
        tourPackageId={row.original.id}
        field="numDaysNight"
      />
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created Date",
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-gray-100"
        >
          Updated Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("updatedAt")}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} readOnly={readOnly} />
  },
];
