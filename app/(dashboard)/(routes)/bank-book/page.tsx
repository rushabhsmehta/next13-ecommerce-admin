"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

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

  // Calculate total balance of all accounts
  const totalBalance = useMemo(() => {
    return bankAccounts.reduce((sum, account) => sum + account.currentBalance, 0);
  }, [bankAccounts]);

  return (
    <div className="p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading
            title={`Bank Book - Closing Balance: ${formatter.format(totalBalance)}`}
            description="Manage and view your bank accounts"
          />
        </div>
        <Button onClick={() => router.push("/bank-accounts/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Bank Account
        </Button>
      </div>
      <Separator className="my-4" />

      {loading ? (
        <div>Loading bank accounts...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((account) => (
            <Card key={account.id} className={!account.isActive ? "opacity-70" : ""}>
              <CardHeader>
                <CardTitle>{account.accountName}</CardTitle>
                <CardDescription>
                  {account.bankName} - {account.accountNumber}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Current Balance:</span>
                    <span className="font-medium">
                      {formatter.format(account.currentBalance)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {account.isActive ? "Active Account" : "Inactive Account"}
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