"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Switch } from "@/components/ui/switch";

export type AssociatePartnerColumn = {
  id: string;
  name: string;
  mobileNumber: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export const columns: ColumnDef<AssociatePartnerColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "mobileNumber",
    header: "Mobile Number",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Switch
        checked={row.original.isActive}
        disabled
      />
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];

