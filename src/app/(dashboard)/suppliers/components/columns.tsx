"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type LocationInfo = {
  id: string;
  label: string;
}

export type SupplierColumn = {
  id: string;
  name: string;
  contact: string;
  email: string;
  locations: LocationInfo[];
  createdAt: string;
};

export const columns: ColumnDef<SupplierColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "contact",
    header: "Contact",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "locations",
    header: "Locations",
    cell: ({ row }) => {
      const locations = row.getValue("locations") as LocationInfo[];
      
      if (!locations || locations.length === 0) {
        return <span className="text-muted-foreground">No locations</span>;
      }
      
      return (
        <div className="flex flex-wrap gap-1">
          {locations.slice(0, 3).map((location) => (
            <Badge key={location.id} variant="outline">
              {location.label}
            </Badge>
          ))}
          {locations.length > 3 && (
            <Badge variant="outline">
              +{locations.length - 3} more
            </Badge>
          )}
        </div>
      )
    }
  },

  {
    accessorKey: "createdAt",
    header: "Created At",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];

