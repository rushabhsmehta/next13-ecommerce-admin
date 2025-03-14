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
import { BookIcon, Eye, FileText } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  contact: string;
  email: string;
  associatePartner: string;
  createdAt: string;
  totalSales: number;
  totalReceipts: number;
  outstanding: number;
};

interface CustomersTableProps {
  data: Customer[];
}

export const CustomersTable: React.FC<CustomersTableProps> = ({ data }) => {
  const router = useRouter();
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Customer Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Associate</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">Receipts</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No customers found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.contact}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{item.associatePartner}</TableCell>
                  <TableCell>{item.createdAt}</TableCell>
                  <TableCell className="text-right">{formatPrice(item.totalSales)}</TableCell>
                  <TableCell className="text-right">{formatPrice(item.totalReceipts)}</TableCell>
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
                        className="bg-blue-50 hover:bg-blue-100"
                        onClick={() => router.push(`/customers/${item.id}/ledger`)}
                      >
                        <BookIcon className="h-4 w-4 mr-1" /> View Ledger
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
