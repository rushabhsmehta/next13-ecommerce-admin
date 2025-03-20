"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"

export type CashAccountColumn = {
  id: string
  accountName: string;  // changed from name
  currentBalance: number;  // changed from balance
  createdAt: string;
}

export const columns: ColumnDef<CashAccountColumn>[] = [
  {
    accessorKey: "accountName",  // changed from name
    header: "Account Name",
  },
  {
    accessorKey: "currentBalance",  // changed from balance
    header: "Current Balance",
    cell: ({ row }) => {
      const balance = parseFloat(row.getValue("currentBalance"));
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(balance);
    }
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "createdAt",
    header: "Date Created",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];

