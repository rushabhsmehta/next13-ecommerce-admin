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

type Income = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  category: string;
  paymentMode: string;
  account: string;
};

interface IncomesTableProps {
  data: Income[];
}

export const IncomesTable: React.FC<IncomesTableProps> = ({ data }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No income transactions found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.packageName}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.paymentMode}</TableCell>
                  <TableCell>{item.account}</TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(item.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={6} className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(data.reduce((total, item) => total + item.amount, 0))}
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

