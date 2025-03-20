"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-default">
                    +{locations.length - 3} more
                  </Badge>
                </TooltipTrigger>
                <TooltipContent align="start" className="max-w-[300px] p-2">
                  <p className="text-sm font-medium mb-1">All Locations:</p>
                  <div className="grid grid-cols-1 gap-1">
                    {locations.map((location) => (
                      <span key={location.id} className="text-xs">
                        • {location.label}
                      </span>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

