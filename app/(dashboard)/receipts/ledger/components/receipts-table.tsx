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

type Receipt = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  customerName: string;
  customerContact: string;
  reference: string;
  paymentMode: string;
  account: string;
};

interface ReceiptsTableProps {
  data: Receipt[];
}

export const ReceiptsTable: React.FC<ReceiptsTableProps> = ({ data }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No receipts found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.customerName}</TableCell>
                  <TableCell>{item.packageName}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.reference}</TableCell>
                  <TableCell>{item.paymentMode}</TableCell>
                  <TableCell>{item.account}</TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(item.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={7} className="font-bold">Total</TableCell>
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
