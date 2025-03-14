import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CashAccount } from "@/types";

const CashBookPage = async () => {
  // Get all cash accounts
  const cashAccounts = await prismadb.cashAccount.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title="Cash Book" 
          description="View your cash accounts and transaction records"
        />
        <Separator />
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cashAccounts.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground mb-4">No cash accounts found</p>
              <Button asChild>
                <Link href="/cashaccounts/new">
                  Add a Cash Account
                </Link>
              </Button>
            </div>
          ) : (
            cashAccounts.map((account) => (
              <Link key={account.id} href={`/cash-book/${account.id}`} passHref>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader>
                    <CardTitle>{account.name}</CardTitle>
                    <CardDescription>
                      Cash Account
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

export default CashBookPage;
