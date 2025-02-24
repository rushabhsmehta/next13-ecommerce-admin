'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TourPackageQueryAccountingForm } from "./components/accounts-form"
import { TourPackageQueryDisplay } from "../../fetchaccounts/[tourPackageQueryId]/components/fetchaccounts"
import { useState, useEffect } from "react";
import axios from "axios";

interface AccountPageProps {
  params: {
    tourPackageQueryId: string;
  }
}

const AccountPage: React.FC<AccountPageProps> = ({ params }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch the initial data
    const fetchData = async () => {
      try {
        const response = await axios.get(`/api/tourPackageQuery/${params.tourPackageQueryId}/accounting`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [params.tourPackageQueryId]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Tabs defaultValue="view" className="w-full">
          <TabsList>
            <TabsTrigger value="view">View Accounts</TabsTrigger>
            <TabsTrigger value="edit">Manage Accounts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view">
            <div className="p-4">
              <TourPackageQueryDisplay initialData={data} />
            </div>
          </TabsContent>
          
          <TabsContent value="edit">
            <div className="p-4">
              <TourPackageQueryAccountingForm initialData={data} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AccountPage;
