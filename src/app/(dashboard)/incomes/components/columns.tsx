"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";

export type IncomesColumn = {
  id: string;
  incomeDate: string;
  formattedDate: string;
  amount: number;
  formattedAmount: string;
  incomeCategory: string;
  description: string;
  accountName: string;
};

export const columns: ColumnDef<IncomesColumn>[] = [
  {
    accessorKey: "formattedDate",
    header: "Date",
  },
  {
    accessorKey: "formattedAmount",
    header: "Amount",
  },
  {
    accessorKey: "incomeCategory",
    header: "Category",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "accountName",
    header: "Account",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  }
];

