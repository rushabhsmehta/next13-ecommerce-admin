"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { 
  CalendarIcon, 
  CreditCard, 
  FileText, 
  Package, 
  Tag, 
  TrendingDown,
  Building,
  Receipt,
  ArrowLeft,
  Eye
} from "lucide-react";
import { useRouter } from "next/navigation";

type ExpenseDetailType = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  category: string;
  paymentMode: string;
  account: string;
  // Additional fields that are available
  createdAt?: string;
  updatedAt?: string;
  isAccrued?: boolean;
  accruedDate?: string;
  paidDate?: string;
};

interface ExpenseDetailViewProps {
  expense: ExpenseDetailType;
}

export const ExpenseDetailView: React.FC<ExpenseDetailViewProps> = ({ expense }) => {
  const router = useRouter();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Ledger
            </Button>
          </div>
          <Badge variant="destructive" className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Expense
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Amount Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatPrice(expense.amount)}
              </div>
            </CardContent>
          </Card>

          {/* Date Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expense Date</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {format(new Date(expense.date), "MMM d, yyyy")}
              </div>
            </CardContent>
          </Card>

          {/* Category Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Category</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expense.category}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Expense Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Description
                </div>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {expense.description || "No description provided"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Related Package
                </div>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {expense.packageName || "No package associated"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Payment Mode
                </div>
                <Badge variant="outline" className="text-sm">
                  {expense.paymentMode}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building className="h-4 w-4" />
                  Account
                </div>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {expense.account}
                </p>
              </div>
            </div>

            <Separator />

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Transaction ID</div>
                  <p className="text-sm font-mono bg-muted p-2 rounded">
                    {expense.id}
                  </p>
                </div>

                {expense.isAccrued && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <Badge variant="secondary" className="text-sm">
                      {expense.isAccrued ? "Accrued" : "Paid"}
                    </Badge>
                  </div>
                )}

                {expense.accruedDate && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Accrued Date</div>
                    <p className="text-sm bg-muted p-2 rounded">
                      {format(new Date(expense.accruedDate), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}

                {expense.paidDate && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Paid Date</div>
                    <p className="text-sm bg-muted p-2 rounded">
                      {format(new Date(expense.paidDate), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}

                {expense.createdAt && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Created At</div>
                    <p className="text-sm bg-muted p-2 rounded">
                      {format(new Date(expense.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}

                {expense.updatedAt && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                    <p className="text-sm bg-muted p-2 rounded">
                      {format(new Date(expense.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
