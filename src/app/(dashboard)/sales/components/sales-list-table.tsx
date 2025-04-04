"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { formatPrice } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface SalesListTableProps {
  data: any[];
}

export const SalesListTable: React.FC<SalesListTableProps> = ({ data }) => {
  const router = useRouter();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No sales found
              </TableCell>
            </TableRow>
          )}
          {data.map((sale) => (
            <TableRow key={sale.id} className="hover:bg-muted/30">
              <TableCell>{format(new Date(sale.saleDate), "MMM d, yyyy")}</TableCell>
              <TableCell>{sale.customer?.name || "N/A"}</TableCell>
              <TableCell>{sale.invoiceNumber || "N/A"}</TableCell>
              <TableCell className="text-right font-medium">{formatPrice(sale.salePrice)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <div className={`py-1 px-2 rounded-md text-xs ${
                    sale.status === "completed" ? "bg-green-100 text-green-800" : 
                    sale.status === "pending" ? "bg-amber-100 text-amber-800" : 
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {sale.status?.charAt(0).toUpperCase() + sale.status?.slice(1) || "N/A"}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => router.push(`/sales/${sale.id}`)}>
                      Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

