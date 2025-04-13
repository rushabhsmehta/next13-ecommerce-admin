"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface InquiryAction {
  id: string;
  actionType: string;
  remarks: string;
  actionDate: string;
}

interface Inquiry {
  id: string;
  customerName: string;
  customerMobileNumber: string;
  status: string;
  journeyDate: string | null;
  createdAt: string;
  location: { label: string };
  associatePartner: { name: string } | null;
  actions: InquiryAction[];
}

export default function OperationalStaffDashboard() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  
  useEffect(() => {
    async function fetchInquiries() {
      try {
        const res = await fetch("/api/ops/my-inquiries");
        
        if (!res.ok) {
          if (res.status === 401) {
            // Redirect to login if unauthorized
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch inquiries");
        }
        
        const data = await res.json();
        setInquiries(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load inquiries");
      } finally {
        setLoading(false);
      }
    }
    
    fetchInquiries();
  }, [router]);
  
  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/ops/signout", {
        method: "POST",
      });
      toast.success("Signed out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };
  
  const filteredInquiries = inquiries.filter((inquiry) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      inquiry.customerName.toLowerCase().includes(searchLower) ||
      inquiry.customerMobileNumber.includes(searchTerm) ||
      inquiry.location.label.toLowerCase().includes(searchLower) ||
      inquiry.status.toLowerCase().includes(searchLower)
    );
  });

  function getStatusBadgeColor(status: string) {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-500";
      case "contacted":
        return "bg-blue-500";
      case "converted":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Assigned Inquiries</h1>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center border rounded-md px-3 py-2">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search inquiries..."
            className="border-0 focus-visible:ring-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium">No inquiries assigned to you</h3>
          <p className="text-gray-500 mt-2">
            When inquiries are assigned to you, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInquiries.map((inquiry) => (
            <Card key={inquiry.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{inquiry.customerName}</CardTitle>
                    <CardDescription>
                      {inquiry.customerMobileNumber}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusBadgeColor(inquiry.status)}>
                    {inquiry.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium">{inquiry.location.label}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created On</p>
                    <p className="font-medium">
                      {format(new Date(inquiry.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  {inquiry.journeyDate && (
                    <div>
                      <p className="text-gray-500">Journey Date</p>
                      <p className="font-medium">
                        {format(new Date(inquiry.journeyDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  {inquiry.associatePartner && (
                    <div>
                      <p className="text-gray-500">Associate Partner</p>
                      <p className="font-medium">{inquiry.associatePartner.name}</p>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push(`/inquiry/${inquiry.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
