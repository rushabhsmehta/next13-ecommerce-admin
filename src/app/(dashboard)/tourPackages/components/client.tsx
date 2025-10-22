"use client";

import { Plus, MapPin, Tag, Clock, Search, Globe2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { TourPackageColumn, columns, createColumns } from "./columns";
import { DataTableMultiple } from "@/components/ui/data-tableMultiple";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TourPackagesClientProps {
  data: TourPackageColumn[];
  groupedData: Record<string, Record<string, Record<string, TourPackageColumn[]>>>;
  readOnly?: boolean;
};

export const TourPackagesClient: React.FC<TourPackagesClientProps> = ({
  data,
  groupedData,
  readOnly = false
}) => {
  const params = useParams();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('table');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [tableData, setTableData] = useState<TourPackageColumn[]>(data);
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [tableSearch, setTableSearch] = useState<string>("");

  // Listen for tour package updates to refresh data
  useEffect(() => {
    const handleTourPackageUpdate = (event: any) => {
      const { id, field, value, updatedAt } = event.detail;
      
      setTableData(prevData => 
        prevData.map(item => 
          item.id === id 
            ? { 
                ...item, 
                [field === 'numDaysNight' ? 'duration' : field]: value,
                updatedAt: updatedAt ? new Date(updatedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })
              } 
            : item
        )
      );
    };

    window.addEventListener('tourPackageUpdated', handleTourPackageUpdate);
    return () => window.removeEventListener('tourPackageUpdated', handleTourPackageUpdate);
  }, []);

  // Update tableData when data prop changes
  useEffect(() => {
    setTableData(data);
  }, [data]);

  const dynamicColumns = createColumns(readOnly);

  // Get all locations with search filter
  const allLocations = Object.keys(groupedData).filter(location =>
    location.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // Get categories for selected location
  const availableCategories = selectedLocation ? Object.keys(groupedData[selectedLocation] || {}) : [];

  // Get durations for selected location and category
  const availableDurations = selectedLocation && selectedCategory 
    ? Object.keys(groupedData[selectedLocation]?.[selectedCategory] || {}) 
    : [];

  // Get packages for selected location, category, and duration
  const selectedPackages = selectedLocation && selectedCategory && selectedDuration
    ? groupedData[selectedLocation]?.[selectedCategory]?.[selectedDuration] || []
    : [];

  // Reset selections when location changes
  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setSelectedCategory('');
    setSelectedDuration('');
  };

  // Reset duration when category changes
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedDuration('');
  };

  // Unique locations for filter (table view)
  const locationOptions = Array.from(new Set(data.map(p => p.location))).sort((a, b) => a.localeCompare(b));

  // Apply table view location filter
  const filteredTableData = locationFilter ? tableData.filter(p => p.location === locationFilter) : tableData;

  return (
    <> 
      <div className="flex items-center justify-between">
        <Heading title={`Tour Packages (${data.length})`} description="Manage tour packages for your Website" />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/tourPackages/website-management`)}
          >
            <Globe2 className="mr-2 h-4 w-4" /> Website Management
          </Button>
          <Button 
            variant={viewMode === 'grouped' ? 'default' : 'outline'}
            onClick={() => setViewMode('grouped')}
          >
            Location View
          </Button>
          <Button 
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
          >
            Table View
          </Button>
          {!readOnly && (
            <Button onClick={() => router.push(`/tourPackages/new`)}>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          )}
        </div>
      </div>
      <Separator />

      {viewMode === 'grouped' ? (
        <div className="p-6 bg-gray-50 min-h-[calc(100vh-200px)]">
          
          {/* Search Bar */}
          <div className="mb-6 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>

          {/* Flowchart Layout */}
          <div className="space-y-8 overflow-x-auto">
            {allLocations.map((location) => {
              const categories = groupedData[location];
              const isLocationSelected = selectedLocation === location;
              
              return (
                <div key={location} className="flex items-start gap-4 min-w-max">
                  
                  {/* Location Box */}
                  <div className="flex flex-col items-center">
                    <div 
                      className={`px-6 py-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                        isLocationSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-300 bg-white hover:border-blue-300'
                      }`}
                      onClick={() => handleLocationSelect(location)}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-lg">{location}</span>
                      </div>
                      <Badge variant="secondary" className="mt-2">
                        {Object.values(categories).reduce((total, durations) => 
                          total + Object.values(durations).reduce((dTotal, packages) => dTotal + packages.length, 0), 0
                        )} packages
                      </Badge>
                    </div>
                    
                    {/* Connection Line */}
                    {isLocationSelected && (
                      <div className="w-0.5 h-8 bg-blue-500"></div>
                    )}
                  </div>

                  {/* Categories Flow */}
                  {isLocationSelected && (
                    <div className="flex flex-col gap-4">
                      {Object.entries(categories).map(([category, durations]) => {
                        const isCategorySelected = selectedCategory === category;
                        
                        return (
                          <div key={category} className="flex items-center gap-4">
                            
                            {/* Horizontal Connection */}
                            <div className="w-8 h-0.5 bg-blue-500"></div>
                            
                            {/* Category Box */}
                            <div className="flex items-center gap-4">
                              <div 
                                className={`px-4 py-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                                  isCategorySelected 
                                    ? 'border-green-500 bg-green-50 shadow-md' 
                                    : 'border-gray-300 bg-white hover:border-green-300'
                                }`}
                                onClick={() => handleCategorySelect(category)}
                              >
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">{category}</span>
                                </div>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {Object.values(durations).reduce((total, packages) => total + packages.length, 0)} packages
                                </Badge>
                              </div>

                              {/* Durations Flow */}
                              {isCategorySelected && (
                                <div className="flex items-center gap-4">
                                  
                                  {/* Horizontal Connection */}
                                  <div className="w-8 h-0.5 bg-green-500"></div>
                                  
                                  <div className="flex flex-col gap-3">
                                    {Object.entries(durations).map(([duration, packages]) => {
                                      const isDurationSelected = selectedDuration === duration;
                                      
                                      return (
                                        <div key={duration} className="flex items-center gap-4">
                                          
                                          {/* Duration Box */}
                                          <div 
                                            className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                                              isDurationSelected 
                                                ? 'border-purple-500 bg-purple-50 shadow-md' 
                                                : 'border-gray-300 bg-white hover:border-purple-300'
                                            }`}
                                            onClick={() => setSelectedDuration(duration)}
                                          >
                                            <div className="flex items-center gap-2">
                                              <Clock className="h-4 w-4 text-purple-600" />
                                              <span className="font-medium text-sm">{duration}</span>
                                            </div>
                                            <Badge variant="secondary" className="mt-1 text-xs">
                                              {packages.length}
                                            </Badge>
                                          </div>

                                          {/* Packages Flow */}
                                          {isDurationSelected && (
                                            <div className="flex items-center gap-4">
                                              
                                              {/* Horizontal Connection */}
                                              <div className="w-8 h-0.5 bg-purple-500"></div>
                                              
                                              <div className="flex flex-col gap-2 max-w-md">
                                                {packages.map((pkg) => (
                                                  <div 
                                                    key={pkg.id}
                                                    className="px-4 py-3 border-2 border-orange-300 bg-orange-50 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:border-orange-500"
                                                    onClick={() => router.push(`/tourPackages/${pkg.id}`)}
                                                  >
                                                    <div className="flex items-start justify-between gap-3">
                                                      <div className="flex-1">
                                                        <h4 className="font-semibold text-sm text-orange-800 leading-tight mb-1">
                                                          {pkg.tourPackageName}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-xs text-orange-600">
                                                          <span>{pkg.tourPackageType}</span>
                                                          <span>•</span>
                                                          <span className="font-medium">{pkg.price}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1">
                                                          {pkg.isFeatured && (
                                                            <Badge className="bg-yellow-500 text-xs">Featured</Badge>
                                                          )}
                                                          {pkg.isArchived && (
                                                            <Badge variant="secondary" className="text-xs">Archived</Badge>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                              
                                            </div>
                                          )}
                                          
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                </div>
                              )}
                              
                            </div>
                            
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Select
              value={locationFilter}
              onValueChange={(v) => setLocationFilter(v)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {locationOptions.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {locationFilter && (
              <Button variant="outline" onClick={() => setLocationFilter("")}>Reset Location</Button>
            )}
          </div>
          <DataTableMultiple 
            searchKeys={["tourPackageName", "location"]} 
            columns={dynamicColumns} 
            data={filteredTableData}
            searchValue={tableSearch}
            onSearchChange={setTableSearch}
            searchPlaceholder="Search tour packages..."
          />
        </div>
      )}

    </>
  );
};

