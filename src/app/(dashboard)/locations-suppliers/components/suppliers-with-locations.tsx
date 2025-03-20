"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  locations: Array<{
    location: {
      id: string;
      label: string;  // Changed from 'name' to 'label' to match your schema
    }
  }>;
}

interface SuppliersWithLocationsProps {
  data: Supplier[];
}

export const SuppliersWithLocations: React.FC<SuppliersWithLocationsProps> = ({
  data
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter suppliers based on search term
  const filteredSuppliers = searchTerm 
    ? data.filter(supplier => 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contact && supplier.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        supplier.locations.some(l => 
          l.location.label.toLowerCase().includes(searchTerm.toLowerCase()) // Changed from l.location.name
        )
      )
    : data;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search suppliers or locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      {filteredSuppliers.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No suppliers found matching your search criteria
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex justify-between items-center">
                  {supplier.name}
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/suppliers/${supplier.id}`)}
                  >
                    Edit Supplier
                  </Button>
                </CardTitle>
                <CardDescription>
                  {supplier.contact && `Contact: ${supplier.contact} | `}
                  {supplier.email && `Email: ${supplier.email} | `}
                  {supplier.locations.length} location(s) associated
                </CardDescription>
              </CardHeader>
              <CardContent>
                {supplier.locations.length === 0 ? (
                  <p className="text-muted-foreground">No locations associated with this supplier</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location Name</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplier.locations.map((item) => (
                        <TableRow key={item.location.id}>
                          <TableCell className="font-medium">{item.location.label}</TableCell> {/* Changed from item.location.name */}
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/locations/${item.location.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
