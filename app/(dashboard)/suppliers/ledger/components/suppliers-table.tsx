"use client";

import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type SupplierSummary = {
  id: string;
  name: string;
  contact: string;
  totalPurchases: number;
  totalPayments: number;
  balance: number;
};

interface SuppliersTableProps {
  data: SupplierSummary[];
}

export const SuppliersTable: React.FC<SuppliersTableProps> = ({ data }) => {
  const router = useRouter();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supplier</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-right">Total Purchases</TableHead>
            <TableHead className="text-right">Total Payments</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No suppliers found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.contact}</TableCell>
                  <TableCell className="text-right">{formatPrice(item.totalPurchases)}</TableCell>
                  <TableCell className="text-right">{formatPrice(item.totalPayments)}</TableCell>
                  <TableCell 
                    className={`text-right font-medium ${
                      item.balance > 0 
                        ? "text-red-600" 
                        : item.balance < 0 
                          ? "text-green-600" 
                          : ""
                    }`}
                  >
                    {formatPrice(item.balance)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => router.push(`/suppliers/${item.id}/ledger`)}
                    >
                      View Ledger
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              <TableRow>
                <TableCell colSpan={2} className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{formatPrice(data.reduce((sum, item) => sum + item.totalPurchases, 0))}</TableCell>
                <TableCell className="text-right font-bold">{formatPrice(data.reduce((sum, item) => sum + item.totalPayments, 0))}</TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(data.reduce((sum, item) => sum + item.balance, 0))}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
