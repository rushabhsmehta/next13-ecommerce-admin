import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { formatter } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BankAccount } from "@/types";

const BankBookPage = async () => {
  // Get all bank accounts
  const bankAccounts = await prismadb.bankAccount.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title="Bank Book" 
          description="View your bank accounts and transaction records"
        />
        <Separator />
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bankAccounts.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground mb-4">No bank accounts found</p>
              <Button asChild>
                <Link href="/bankaccounts/new">
                  Add a Bank Account
                </Link>
              </Button>
            </div>
          ) : (
            bankAccounts.map((account) => (
              <Link key={account.id} href={`/bank-book/${account.id}`} passHref>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader>
                    <CardTitle>{account.name}</CardTitle>
                    <CardDescription>
                      A/C No: {account.accountNumber}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPrice(account.openingBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">Opening Balance</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">View Transactions</Button>
                  </CardFooter>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BankBookPage;
