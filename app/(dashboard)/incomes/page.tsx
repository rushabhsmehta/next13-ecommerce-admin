"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { ApiList } from "@/components/ui/api-list";
import { format } from "date-fns";

import { columns } from "./components/columns";

const IncomesPage = () => {
  const router = useRouter();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncomes = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/incomes');
        setIncomes(response.data.map((income: any) => ({
          ...income,
          formattedDate: format(new Date(income.incomeDate), 'MMMM dd, yyyy'),
          formattedAmount: new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
          }).format(income.amount),
          accountName: income.bankAccount?.accountName || income.cashAccount?.accountName || 'N/A'
        })));
      } catch (error) {
        console.error("Error fetching incomes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIncomes();
  }, []);

  return (
    <div className="flex-col">
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <Heading
        title={`Incomes (${incomes.length})`}
        description="Manage your income entries"
        />
        <Button onClick={() => router.push(`/incomes/new`)}>
        <Plus className="mr-2 h-4 w-4" />
        Add New
        </Button>
      </div>
      <Separator />
      {loading ? (
        <div className="flex items-center justify-center py-4">Loading...</div>
      ) : (
        <DataTable
        columns={columns}
        data={incomes}
        searchKey="description"
        />
      )}
      <Heading title="API" description="API calls for Incomes" />
      <Separator />
      <ApiList entityName="incomes" entityIdName="incomeId" />
    </div>
    </div>
  );
};

export default IncomesPage;
