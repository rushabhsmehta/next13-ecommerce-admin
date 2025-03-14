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
import { BookText, Eye } from "lucide-react";

type CustomerSummary = {
  id: string;
  name: string;
  contact: string | null; // Updated to accept null values
  totalSales: number;
  totalReceipts: number;
  balance: number;
};

interface CustomersTableProps {
  data: CustomerSummary[];
}

export const CustomersTable: React.FC<CustomersTableProps> = ({ data }) => {
  const router = useRouter();

  const handleViewCustomer = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };
  
  const handleViewLedger = (customerId: string) => {
    router.push(`/customers/${customerId}/ledger`);
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-right">Total Sales</TableHead>
            <TableHead className="text-right">Total Receipts</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No customers found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.contact || "-"}</TableCell>
                  <TableCell className="text-right">{formatPrice(customer.totalSales)}</TableCell>
                  <TableCell className="text-right">{formatPrice(customer.totalReceipts)}</TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(customer.balance)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewCustomer(customer.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewLedger(customer.id)}
                      >
                        <BookText className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} className="font-bold">Totals</TableCell>
                <TableCell className="text-right font-bold">{formatPrice(data.reduce((total, customer) => total + customer.totalSales, 0))}</TableCell>
                <TableCell className="text-right font-bold">{formatPrice(data.reduce((total, customer) => total + customer.totalReceipts, 0))}</TableCell>
                <TableCell className="text-right font-bold">{formatPrice(data.reduce((total, customer) => total + customer.balance, 0))}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
