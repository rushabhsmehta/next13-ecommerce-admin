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
import { Plus, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const [refreshing, setRefreshing] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  
  // Calculate consolidated balance
  const consolidatedBalance = cashAccounts.reduce((total, account) => 
    total + (account.isActive ? account.currentBalance : 0), 0);
  
  // Calculate active accounts
  const activeAccounts = cashAccounts.filter(account => account.isActive);

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

  const handleRefreshBalances = async () => {
    setRefreshing(true);
    try {
      // Call an API endpoint to recalculate all cash account balances
      await axios.post("/api/cash-accounts/recalculate-all");
      // Refetch the cash accounts with updated balances
      const response = await axios.get("/api/cash-accounts");
      setCashAccounts(response.data);
    } catch (error) {
      console.error("Failed to refresh balances:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="p-8 pt-6">
      <div className="flex items-center justify-between">
        <Heading
          title="Cash Book"
          description="Manage and view your cash accounts"
        />
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshBalances} 
            disabled={refreshing || loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Balances
          </Button>
          <Button onClick={() => router.push("/cash-accounts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Cash Account
          </Button>
        </div>
      </div>
      <Separator className="my-4" />

      {/* Consolidated Balance Card */}
      {!loading && (
        <Card className="mb-6 bg-slate-50 dark:bg-slate-900 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Consolidated Cash Balance</CardTitle>
            <CardDescription>
              Total balance across {activeAccounts.length} active cash account{activeAccounts.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatter.format(consolidatedBalance)}</div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div>Loading cash accounts...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cashAccounts.map((account) => (
            <Card key={account.id} className={!account.isActive ? "opacity-70" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle>{account.accountName}</CardTitle>
                  <Badge variant={account.isActive ? "default" : "outline"}>
                    {account.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Current Balance:</span>
                    <span className="font-medium text-xl">
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
