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

interface Location {
  id: string;
  label: string;  // Changed from 'name' to 'label' to match your schema
  suppliers: Array<{
    supplier: {
      id: string;
      name: string;
      contact: string | null;
      email: string | null;
    }
  }>;
}

interface LocationsWithSuppliersProps {
  data: Location[];
}

export const LocationsWithSuppliers: React.FC<LocationsWithSuppliersProps> = ({
  data
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter locations based on search term
  const filteredLocations = searchTerm 
    ? data.filter(location => 
        location.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.suppliers.some(s => 
          s.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search locations or suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      {filteredLocations.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No locations found matching your search criteria
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredLocations.map((location) => (
            <Card key={location.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex justify-between items-center">
                  {location.label}  {/* Changed from location.name to location.label */}
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/locations/${location.id}`)}
                  >
                    Edit Location
                  </Button>
                </CardTitle>
                <CardDescription>
                  {location.suppliers.length} supplier(s) associated
                </CardDescription>
              </CardHeader>
              <CardContent>
                {location.suppliers.length === 0 ? (
                  <p className="text-muted-foreground">No suppliers associated with this location</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {location.suppliers.map((item) => (
                        <TableRow key={item.supplier.id}>
                          <TableCell className="font-medium">{item.supplier.name}</TableCell>
                          <TableCell>{item.supplier.contact || "-"}</TableCell>
                          <TableCell>{item.supplier.email || "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/suppliers/${item.supplier.id}`)}
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
