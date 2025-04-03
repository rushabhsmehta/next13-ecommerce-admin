"use client";

import { InquiryColumn } from "./columns";
import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Phone, Calendar, MapPin } from "lucide-react";
import { CellAction } from "./cell-action";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from "axios";
import { toast } from "react-hot-toast";

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-800 hover:bg-green-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 hover:bg-red-200";
    default:
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
  }
};

interface MobileInquiryCardProps {
  data: InquiryColumn[];
}

export const MobileInquiryCard: React.FC<MobileInquiryCardProps> = ({ data }) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const onStatusChange = async (inquiryId: string, newStatus: string) => {
    try {
      await axios.patch(`/api/inquiries/${inquiryId}/status`, {
        status: newStatus
      });
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        No inquiries found. Create a new inquiry to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map(inquiry => (
        <Card key={inquiry.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-lg">{inquiry.customerName}</h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Phone className="w-3 h-3 mr-1" />
                    {inquiry.customerMobileNumber}
                  </div>
                </div>
                <Select
                  defaultValue={inquiry.status}
                  onValueChange={(value) => onStatusChange(inquiry.id, value)}
                >
                  <SelectTrigger className={`w-32 h-8 text-xs ${getStatusColor(inquiry.status)}`}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem
                        key={status.value}
                        value={status.value}
                        className={
                          status.value === "CONFIRMED" ? "text-green-600" :
                          status.value === "CANCELLED" ? "text-red-600" :
                          "text-yellow-600"
                        }
                      >
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center text-sm">
                  <MapPin className="w-3 h-3 mr-1 text-blue-500" />
                  <span className="truncate">{inquiry.location}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <Calendar className="w-3 h-3 mr-1 text-purple-500" />
                  <span>{inquiry.journeyDate}</span>
                </div>
              </div>
              
              <div className="mt-3 text-sm">
                <Badge variant="outline" className="mr-2">
                  {inquiry.associatePartner}
                </Badge>
              </div>
            </div>
            
            {expandedRows[inquiry.id] && (
              <div className="p-4 bg-gray-50">
                <div className="mb-3">
                  <h4 className="text-sm font-medium mb-2">Recent Actions</h4>
                  {inquiry.actionHistory && inquiry.actionHistory.length > 0 ? (
                    <div className="space-y-2">
                      {inquiry.actionHistory.slice(0, 2).map((action, index) => (
                        <div 
                          key={index} 
                          className={`
                            text-xs rounded-md p-2 border-l-2
                            ${action.type === "CALL" ? "border-green-500 bg-green-50" :
                              action.type === "MESSAGE" ? "border-blue-500 bg-blue-50" :
                              action.type === "EMAIL" ? "border-yellow-500 bg-yellow-50" :
                              "border-gray-500 bg-gray-50"}
                          `}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{action.type}</span>
                            <span className="text-muted-foreground text-xs">
                              {new Date(action.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          {action.remarks && (
                            <div className="text-muted-foreground mt-1 truncate">
                              {action.remarks}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No actions recorded</div>
                  )}
                </div>
                
                <div className="mb-3">
                  <h4 className="text-sm font-medium mb-2">Tour Package Queries</h4>
                  {inquiry.tourPackageQueries && inquiry.tourPackageQueries.length > 0 ? (
                    <ol className="list-decimal pl-4 text-sm">
                      {inquiry.tourPackageQueries.map((query) => (
                        <li key={query.id} className="my-1">
                          <a href={`/tourPackageQuery/${query.id}`} className="text-blue-600 hover:underline truncate block">
                            {query.tourPackageQueryName || 'Unnamed Package Query'}
                          </a>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="text-sm text-gray-500">No queries created</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between px-4 py-2 bg-gray-100">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => toggleRow(inquiry.id)}
              className="text-xs flex items-center gap-1"
            >
              {expandedRows[inquiry.id] ? (
                <>Less info <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>More info <ChevronDown className="h-3 w-3" /></>
              )}
            </Button>
            <CellAction data={inquiry} />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};