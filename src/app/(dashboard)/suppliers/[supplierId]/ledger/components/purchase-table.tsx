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

type Purchase = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
};

interface PurchaseTableProps {
  data: Purchase[];
}

export const SalesTable: React.FC<PurchaseTableProps> = ({ data }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.date}</TableCell>
              <TableCell>{item.packageName}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell className="text-right font-medium">{formatPrice(item.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={3} className="font-bold">Total</TableCell>
            <TableCell className="text-right font-bold">
              {formatPrice(data.reduce((total, item) => total + item.amount, 0))}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
