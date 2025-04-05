"use client";

import { formatPrice } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CellAction } from "./cell-action";

type Transaction = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  type: string;
  reference?: string;
  paymentMode?: string;
  account?: string;
};

interface LedgerTransactionsTableProps {
  data: Transaction[];
}

export const LedgerTransactionsTable: React.FC<LedgerTransactionsTableProps> = ({ data }) => {
  let runningBalance = 0;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => {
                // Update running balance
                if (item.type === "SALE") {
                  runningBalance += item.amount;
                } else if (item.type === "RECEIPT") {
                  runningBalance -= item.amount;
                }

                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.type === "SALE" ? "outline" : "secondary"}
                      >
                        {item.type === "SALE" ? "Sale" : "Payment"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.packageName}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {item.type === "SALE" ? formatPrice(item.amount) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.type === "RECEIPT" ? formatPrice(item.amount) : "-"}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      runningBalance > 0 ? "text-red-600" : runningBalance < 0 ? "text-green-600" : ""
                    }`}>
                      {formatPrice(runningBalance)}
                    </TableCell>
                    <TableCell>
                      <CellAction data={item} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
