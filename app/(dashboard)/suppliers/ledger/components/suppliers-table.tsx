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
import { Eye } from "lucide-react";

type SupplierSummary = {
  id: string;
  name: string;
  contact: string | null; // Updated to accept null values
  totalPurchases: number;
  totalPayments: number;
  balance: number;
};

interface SuppliersTableProps {
  data: SupplierSummary[];
}

export const SuppliersTable: React.FC<SuppliersTableProps> = ({ data }) => {
  const router = useRouter();

  const handleViewSupplier = (supplierId: string) => {
    router.push(`/suppliers/${supplierId}`);
  };
  
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
              {data.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.contact || "-"}</TableCell>
                  <TableCell className="text-right">{formatPrice(supplier.totalPurchases)}</TableCell>
                  <TableCell className="text-right">{formatPrice(supplier.totalPayments)}</TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(supplier.balance)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleViewSupplier(supplier.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} className="font-bold">Totals</TableCell>
                <TableCell className="text-right font-bold">{formatPrice(data.reduce((total, supplier) => total + supplier.totalPurchases, 0))}</TableCell>
                <TableCell className="text-right font-bold">{formatPrice(data.reduce((total, supplier) => total + supplier.totalPayments, 0))}</TableCell>
                <TableCell className="text-right font-bold">{formatPrice(data.reduce((total, supplier) => total + supplier.balance, 0))}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
