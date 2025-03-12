"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";

export type ExpensesColumn = {
  id: string;
  expenseDate: string;
  formattedDate: string;
  amount: number;
  formattedAmount: string;
  expenseCategory: string;
  description: string;
  accountName: string;
};

export const columns: ColumnDef<ExpensesColumn>[] = [
  {
    accessorKey: "formattedDate",
    header: "Date",
  },
  {
    accessorKey: "formattedAmount",
    header: "Amount",
  },
  {
    accessorKey: "expenseCategory",
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
