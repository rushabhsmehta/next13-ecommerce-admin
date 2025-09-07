"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { CellAction } from "./cell-action"
import { EditableSelectCell, EditableInputCell } from "./editable-cells"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";

// Local cell component to toggle isFeatured with optimistic UI
const FeaturedToggle = ({ id, initial }: { id: string; initial: boolean }) => {
  const router = useRouter();
  const [value, setValue] = useState<boolean>(initial);
  const [busy, setBusy] = useState<boolean>(false);

  const update = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    const prev = value;
    setValue(next); // optimistic
    try {
      const res = await fetch(`/api/tourPackages/${id}/field-update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'isFeatured', value: next })
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success(next ? 'Made available on website' : 'Removed from website');
      router.refresh();
    } catch (e) {
      console.error(e);
      setValue(prev); // revert
      toast.error('Could not update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Switch checked={value} onCheckedChange={update} disabled={busy} />
  );
};

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
    accessorKey: "isFeatured",
    header: "Available on Website",
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <FeaturedToggle id={row.original.id} initial={row.original.isFeatured} />
      </div>
    ),
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
    accessorKey: "isFeatured",
    header: "Available on Website",
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <FeaturedToggle id={row.original.id} initial={row.original.isFeatured} />
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} readOnly={readOnly} />
  },
];
