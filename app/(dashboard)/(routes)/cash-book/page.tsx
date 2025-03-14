"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'INR'
});

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CashAccount {
  id: string;
  accountName: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

const CashBookPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);

  useEffect(() => {
    const fetchCashAccounts = async () => {
      try {
        const response = await axios.get("/api/cash-accounts");
        setCashAccounts(response.data);
      } catch (error) {
        console.error("Failed to fetch cash accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCashAccounts();
  }, []);

  return (
    <div className="p-8 pt-6">
      <div className="flex items-center justify-between">
        <Heading
          title="Cash Book"
          description="Manage and view your cash accounts"
        />
        <Button onClick={() => router.push("/cash-accounts/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Cash Account
        </Button>
      </div>
      <Separator className="my-4" />

      {loading ? (
        <div>Loading cash accounts...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cashAccounts.map((account) => (
            <Card key={account.id} className={!account.isActive ? "opacity-70" : ""}>
              <CardHeader>
                <CardTitle>{account.accountName}</CardTitle>
                <CardDescription>
                  {account.isActive ? "Active" : "Inactive"} Cash Account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Current Balance:</span>
                    <span className="font-medium">
                      {formatter.format(account.currentBalance)}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push(`/cash-book/${account.id}`)}
                >
                  View Cash Book
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!loading && cashAccounts.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            No cash accounts found. Create your first cash account to start tracking cash transactions.
          </p>
          <Button onClick={() => router.push("/cash-accounts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Cash Account
          </Button>
        </div>
      )}
    </div>
  );
};

export default CashBookPage;