"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Eye, TrendingUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";

type Transaction = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  category: string;
  paymentMode: string;
  account: string;
  type: "income" | "expense";
  viewLink: string;
};

interface ComprehensiveLedgerTableProps {
  data: Transaction[];
}

export const ComprehensiveLedgerTable: React.FC<ComprehensiveLedgerTableProps> = ({ data }) => {
  const router = useRouter();

  const totalAmount = data.reduce((sum, transaction) => {
    return transaction.type === "income" ? sum + transaction.amount : sum - transaction.amount;
  }, 0);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-center w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell>{format(new Date(item.date), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={item.type === "income" ? "default" : "destructive"} 
                      className={`flex items-center gap-1 w-fit ${
                        item.type === "income" ? "bg-green-600" : ""
                      }`}
                    >
                      {item.type === "income" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.packageName || 'N/A'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {item.description || 'No description'}
                  </TableCell>
                  <TableCell>{item.paymentMode}</TableCell>
                  <TableCell>{item.account}</TableCell>
                  <TableCell className={`text-right font-medium ${
                    item.type === "income" ? "text-green-600" : "text-red-600"
                  }`}>
                    {item.type === "income" ? "+" : "-"}{formatPrice(item.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(item.viewLink)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-primary">
                <TableCell colSpan={7} className="font-bold">Net Total</TableCell>
                <TableCell className={`text-right font-bold ${
                  totalAmount >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {totalAmount >= 0 ? "+" : ""}{formatPrice(totalAmount)}
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
