"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { columns } from "./columns";

interface TransportPricingClientProps {
  data: any[];
}

export const TransportPricingClient: React.FC<TransportPricingClientProps> = ({
  data
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationParam = searchParams.get('locationId');

  // Find the location name from the locationId, if provided in URL
  const findLocationNameById = (locationId: string | null) => {
    if (!locationId) return null;
    
    const matchingItem = data.find(item => item.locationId === locationId);
    return matchingItem ? matchingItem.location : null;
  };

  const initialLocationName = findLocationNameById(locationParam);
  
  const [filteredData, setFilteredData] = useState(data);
  const [locationFilter, setLocationFilter] = useState<string | null>(initialLocationName);
  const [transportTypeFilter, setTransportTypeFilter] = useState<string | null>(null);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Extract unique locations and vehicle types, and sort alphabetically
  const locations = Array.from(new Set(data.map(item => item.location)))
    .sort((a, b) => a.localeCompare(b));
  
  const vehicleTypes = Array.from(new Set(data.map(item => item.vehicleType)))
    .sort((a, b) => a.localeCompare(b));

  // Run filtering logic whenever any filter changes
  useEffect(() => {
    let result = data;
    if (locationFilter) {
      result = result.filter(item => item.location === locationFilter);
    }
    if (transportTypeFilter) {
      result = result.filter(item => item.transportType === transportTypeFilter);
    }
    if (vehicleTypeFilter) {
      result = result.filter(item => item.vehicleType === vehicleTypeFilter);
    }
    if (activeFilter !== null) {
      const isActive = activeFilter === 'active';
      result = result.filter(item => item.isActive === isActive);
    }
    setFilteredData(result);
  }, [data, locationFilter, transportTypeFilter, vehicleTypeFilter, activeFilter]);

  // Reset filters
  const resetFilters = () => {
    setLocationFilter(null);
    setTransportTypeFilter(null);
    setVehicleTypeFilter(null);
    setActiveFilter(null);
    setFilteredData(data);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading 
          title={`Transport Pricing (${filteredData.length})`}
          description="Manage vehicle transport pricing for different locations"
        />
        <Button onClick={() => router.push(`/transport-pricing/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>
      <Separator />
      
      {/* Filter section */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
          <div>
            <Select
              value={locationFilter || ""}
              onValueChange={(value) => {
                setLocationFilter(value || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select
              value={vehicleTypeFilter || ""}
              onValueChange={(value) => {
                setVehicleTypeFilter(value || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Vehicles</SelectItem>
                {vehicleTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select
              value={transportTypeFilter || ""}
              onValueChange={(value) => {
                setTransportTypeFilter(value || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by price type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Price Types</SelectItem>
                <SelectItem value="PerDay">Per Day</SelectItem>
                <SelectItem value="PerTrip">Per Trip</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select
              value={activeFilter || ""}
              onValueChange={(value) => {
                setActiveFilter(value || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            onClick={resetFilters}
          >
            Reset Filters
          </Button>
        </div>
      </div>
      
      <DataTable 
        columns={columns} 
        data={filteredData} 
        searchKey="vehicleType"
        searchPlaceholder="Search vehicle types..."
      />
    </>
  );
};