"use client";

import { useState } from "react";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationsWithSuppliers } from "./locations-with-suppliers";
import { SuppliersWithLocations } from "./suppliers-with-locations";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface Location {
  id: string;
  label: string;  // Changed from name to label
  suppliers: Array<{
    supplier: {
      id: string;
      name: string;
      contact: string | null;
      email: string | null;
    }
  }>;
}

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  locations: Array<{
    location: {
      id: string;
      label: string;  // Changed from name to label
    }
  }>;
}

interface LocationSupplierClientProps {
  locations: Location[];
  suppliers: Supplier[];
}

export const LocationSupplierClient: React.FC<LocationSupplierClientProps> = ({
  locations,
  suppliers
}) => {
  const [activeTab, setActiveTab] = useState<string>("locations");
  const router = useRouter();
  
  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between w-full">
        <Heading
          title="Location-Supplier Relationships"
          description="Manage relationships between locations and suppliers"
        />
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push(`/locations/new`)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Location
          </Button>
          <Button onClick={() => router.push(`/suppliers/new`)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Supplier
          </Button>
        </div>
      </div>
      <Separator />
      
      <Tabs defaultValue="locations" className="w-full" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="locations">View by Location</TabsTrigger>
          <TabsTrigger value="suppliers">View by Supplier</TabsTrigger>
        </TabsList>
        <TabsContent value="locations">
          <LocationsWithSuppliers data={locations} />
        </TabsContent>
        <TabsContent value="suppliers">
          <SuppliersWithLocations data={suppliers} />
        </TabsContent>
      </Tabs>
    </>
  );
};
