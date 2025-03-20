"use client"

import { ColumnDef } from "@tanstack/react-table"
import { formatPrice } from "@/lib/utils"
import { CellAction } from "./cell-action"
import { Badge } from "@/components/ui/badge"
import { Building2, Wallet } from "lucide-react"

export type TransferColumn = {
  id: string
  date: string
  amount: number
  reference: string
  fromAccount: string
  toAccount: string
  fromType: string
  toType: string
  description: string
}

export const columns: ColumnDef<TransferColumn>[] = [
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "fromAccount",
    header: "From Account",
    cell: ({ row }) => (
      <div className="flex items-center">
        {row.original.fromType === "Bank" ? (
          <Building2 className="h-4 w-4 mr-2 text-blue-600" />
        ) : (
          <Wallet className="h-4 w-4 mr-2 text-green-600" />
        )}
        {row.original.fromAccount}
      </div>
    )
  },
  {
    accessorKey: "toAccount",
    header: "To Account",
    cell: ({ row }) => (
      <div className="flex items-center">
        {row.original.toType === "Bank" ? (
          <Building2 className="h-4 w-4 mr-2 text-blue-600" />
        ) : (
          <Wallet className="h-4 w-4 mr-2 text-green-600" />
        )}
        {row.original.toAccount}
      </div>
    )
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => formatPrice(row.original.amount)
  },
  {
    accessorKey: "reference",
    header: "Reference",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
]

