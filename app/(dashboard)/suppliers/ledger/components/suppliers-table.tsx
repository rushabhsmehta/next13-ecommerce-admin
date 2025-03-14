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
import { Eye, FileText } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  contact: string;
  email: string;
  createdAt: string;
  totalPurchases: number;
  totalPayments: number;
  outstanding: number;
};

interface SuppliersTableProps {
  data: Supplier[];
}

export const SuppliersTable: React.FC<SuppliersTableProps> = ({ data }) => {
  const router = useRouter();
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Supplier Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Purchases</TableHead>
            <TableHead className="text-right">Payments</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No suppliers found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.contact}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{item.createdAt}</TableCell>
                  <TableCell className="text-right">{formatPrice(item.totalPurchases)}</TableCell>
                  <TableCell className="text-right">{formatPrice(item.totalPayments)}</TableCell>
                  <TableCell 
                    className={`text-right font-bold ${item.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {formatPrice(item.outstanding)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push(`/suppliers/${item.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Profile
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-blue-50 hover:bg-blue-100"
                        onClick={() => router.push(`/suppliers/${item.id}/ledger`)}
                      >
                        <FileText className="h-4 w-4 mr-1" /> Ledger
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
