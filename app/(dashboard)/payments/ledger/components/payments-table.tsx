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
import { Edit } from "lucide-react";

type Payment = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  supplierName: string;
  supplierContact: string;
  reference: string;
  paymentMode: string;
  account: string;
};

interface PaymentsTableProps {
  data: Payment[];
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({ data }) => {
  const router = useRouter();
  
  const handleEditPayment = (paymentId: string) => {
    router.push(`/payments/${paymentId}`);
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-10">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No payments found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.supplierName}</TableCell>
                  <TableCell>{item.packageName}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.reference}</TableCell>
                  <TableCell>{item.paymentMode}</TableCell>
                  <TableCell>{item.account}</TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(item.amount)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditPayment(item.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={8} className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(data.reduce((total, item) => total + item.amount, 0))}
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
