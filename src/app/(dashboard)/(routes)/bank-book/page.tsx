"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

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

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

const BankBookPage = () => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR'
  });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        const response = await axios.get("/api/bank-accounts");
        setBankAccounts(response.data);
      } catch (error) {
        console.error("Failed to fetch bank accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBankAccounts();
  }, []);

  const handleRefreshBalances = async () => {
    setRefreshing(true);
    try {
      // Call an API endpoint to recalculate all bank account balances
      await axios.post("/api/bank-accounts/recalculate-all");
      // Refetch the bank accounts with updated balances
      const response = await axios.get("/api/bank-accounts");
      setBankAccounts(response.data);
    } catch (error) {
      console.error("Failed to refresh balances:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate total balance of all accounts
  const totalBalance = useMemo(() => {
    return bankAccounts.reduce((sum, account) => sum + (account.isActive ? account.currentBalance : 0), 0);
  }, [bankAccounts]);

  // Calculate active accounts
  const activeAccounts = useMemo(() => {
    return bankAccounts.filter(account => account.isActive);
  }, [bankAccounts]);

  return (
    <div className="p-8 pt-6">
      <div className="flex items-center justify-between">
        <Heading
          title="Bank Book"
          description="Manage and view your bank accounts"
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
          <Button onClick={() => router.push("/bank-accounts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Bank Account
          </Button>
        </div>
      </div>
      <Separator className="my-4" />

      {/* Consolidated Balance Card */}
      {!loading && (
        <Card className="mb-6 bg-slate-50 dark:bg-slate-900 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Consolidated Bank Balance</CardTitle>
            <CardDescription>
              Total balance across {activeAccounts.length} active bank account{activeAccounts.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatter.format(totalBalance)}</div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div>Loading bank accounts...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((account) => (
            <Card key={account.id} className={!account.isActive ? "opacity-70" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle>{account.accountName}</CardTitle>
                  <Badge variant={account.isActive ? "default" : "outline"}>
                    {account.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>
                  {account.bankName} - {account.accountNumber}
                </CardDescription>
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
                  onClick={() => router.push(`/bank-book/${account.id}`)}
                >
                  View Bank Book
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!loading && bankAccounts.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            No bank accounts found. Create your first bank account to start tracking bank transactions.
          </p>
          <Button onClick={() => router.push("/bank-accounts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Bank Account
          </Button>
        </div>
      )}
    </div>
  );
};

export default BankBookPage;
