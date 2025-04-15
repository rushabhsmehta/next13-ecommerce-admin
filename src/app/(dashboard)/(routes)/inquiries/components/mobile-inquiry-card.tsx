"use client";

import { InquiryColumn } from "./columns";
import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Phone, Calendar, MapPin, MessageCircle, UserRound } from "lucide-react";
import { CellAction } from "./cell-action";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { toast } from "react-hot-toast";
import { CompactStaffAssignment } from "@/components/compact-staff-assignment";

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "HOT_QUERY", label: "Hot Query" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-800 hover:bg-green-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 hover:bg-red-200";
    case "HOT_QUERY":
      return "bg-orange-100 text-orange-800 hover:bg-orange-200";
    default:
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
  }
};

interface MobileInquiryCardProps {
  data: InquiryColumn[];
  isAssociateUser?: boolean;
}

export const MobileInquiryCard: React.FC<MobileInquiryCardProps> = ({ 
  data,
  isAssociateUser = false 
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isAssociateDomain, setIsAssociateDomain] = useState(false);
  const [associateName, setAssociateName] = useState<string | null>(null);
  const { user } = useUser();

  // Get user display name
  const userFullName = user?.firstName ? `${user?.firstName} ${user?.lastName || ''}`.trim() : "User";
  const userInitials = user?.firstName?.charAt(0) || "U";

  // Check if the domain is associate domain
  useEffect(() => {
    const hostname = window.location.hostname;
    const isAssociate = hostname.includes('associate.aagamholidays.com');
    setIsAssociateDomain(isAssociate);

    // Fetch associate information if in associate domain
    if (isAssociate || isAssociateUser) {
      fetch('/api/associate-partners/me')
        .then(response => {
          if (response.ok) return response.json();
          return null;
        })
        .then(data => {
          if (data && data.name) {
            setAssociateName(data.name);
          }
        })
        .catch(err => {
          console.error("Error fetching associate details:", err);
        });
    }
  }, [isAssociateUser]);

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

  // Function to open WhatsApp with the customer's phone number
  const openWhatsApp = (phoneNumber: string, customerName: string) => {
    // Format the phone number (remove any non-digit characters)
    const formattedNumber = phoneNumber.replace(/\D/g, "");
    
    // Create a message template
    const message = `Hello ${customerName}, this is regarding your travel inquiry with Aagam Holidays.`;
    
    // Create the WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
    
    // Open in a new tab
    window.open(whatsappUrl, "_blank");
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
      {/* Mobile User Info Header */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col">
                  <span className="font-medium text-xs">
                    {isAssociateDomain && associateName ? associateName : userFullName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isAssociateDomain || isAssociateUser ? 'Associate Portal' : 'Admin Dashboard'}
                  </span>
                </div>
              </div>
            </div>
            {/* Only show notification bell in admin domain, not in associate domain */}
            {!isAssociateDomain && !isAssociateUser && <NotificationBell />}
          </div>
        </CardContent>
      </Card>

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
                    
                    {/* WhatsApp button - only shown for associate users or in associate domain */}
                    {(isAssociateUser || isAssociateDomain) && inquiry.customerMobileNumber && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openWhatsApp(inquiry.customerMobileNumber, inquiry.customerName)}
                        className="ml-2 h-6 px-2 py-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="currentColor" 
                          className="mr-1"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Chat
                      </Button>
                    )}
                  </div>
                </div>
                  {/* Display status as a badge instead of dropdown in the header */}
                <Badge className={`${getStatusColor(inquiry.status)}`}>
                  {inquiry.status === "PENDING" ? "Pending" : 
                   inquiry.status === "HOT_QUERY" ? "Hot Query" :
                   inquiry.status === "CONFIRMED" ? "Confirmed" : "Cancelled"}
                </Badge>
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
                <div className="flex flex-wrap items-center justify-between mt-3 gap-2">
                <Badge variant="outline" className="mr-2">
                  {inquiry.associatePartner}
                </Badge>
                
                {/* Staff Assignment Component */}
                <div className="flex items-center">
                  {inquiry.assignedStaffName && (
                    <span className="text-xs text-gray-600 mr-1 flex items-center">
                      <UserRound className="h-3 w-3 mr-1 text-gray-600" />
                      {inquiry.assignedStaffName}
                    </span>
                  )}
                  <CompactStaffAssignment 
                    inquiryId={inquiry.id}
                    assignedStaffId={inquiry.assignedToStaffId}
                    onAssignmentComplete={() => {
                      toast.success("Staff assignment updated");
                      // Refresh data by redirecting to the current URL
                      window.location.reload();
                    }}
                  />
                </div>
              </div>
            </div>
              {expandedRows[inquiry.id] && (
              <div className="p-4 bg-gray-50">
                {inquiry.assignedToStaffId && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-2">Staff Assignment</h4>
                    <div className="text-xs p-2 bg-blue-50 border-l-2 border-blue-500 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center">
                          <UserRound className="h-3 w-3 mr-1" />
                          {inquiry.assignedStaffName}
                        </span>
                        {inquiry.assignedStaffAt && (
                          <span className="text-muted-foreground">
                            Assigned: {new Date(inquiry.assignedStaffAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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

            {/* Status dropdown moved to actions/footer area */}
            <div className="flex items-center gap-2">
              <Select
                defaultValue={inquiry.status}
                onValueChange={(value) => onStatusChange(inquiry.id, value)}
              >
                <SelectTrigger className={`h-8 text-xs ${getStatusColor(inquiry.status)}`} style={{ minWidth: 110 }}>
                  <SelectValue placeholder="Change status" />
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
              <CellAction data={inquiry} />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};