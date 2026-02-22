"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, Phone, MapPin, User, Tag } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { formatLocalDate } from "@/lib/timezone-utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function InquiryDetail(
  props: {
    params: Promise<{ inquiryId: string }>
  }
) {
  const params = use(props.params);
  const [inquiry, setInquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchInquiry() {
      try {
        const res = await fetch(`/api/ops/my-inquiries/${params.inquiryId}`);
        
        if (!res.ok) {
          if (res.status === 401) {
            // Redirect to login if unauthorized
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch inquiry");
        }
        
        const data = await res.json();
        setInquiry(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load inquiry details");
      } finally {
        setLoading(false);
      }
    }
    
    fetchInquiry();
  }, [params.inquiryId, router]);

  function getStatusBadgeColor(status: string) {
    switch (status?.toLowerCase()) {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        
        <div className="text-center py-12 mt-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium">Inquiry not found</h3>          <p className="text-gray-500 mt-2">
            The inquiry you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button className="mt-4" onClick={() => router.push('/')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold ml-4">Inquiry Details</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{inquiry.customerName}</CardTitle>
              <CardDescription>
                <div className="flex items-center mt-1">
                  <Phone className="h-4 w-4 mr-1" />
                  {inquiry.customerMobileNumber}
                </div>
              </CardDescription>
            </div>
            <Badge className={getStatusBadgeColor(inquiry.status)}>
              {inquiry.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{inquiry.location?.label}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Created On</p>                <p className="font-medium">
                  {formatLocalDate(inquiry.createdAt, "PPP")}
                </p>
              </div>
            </div>
            
            {inquiry.journeyDate && (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Journey Date</p>                  <p className="font-medium">
                    {formatLocalDate(inquiry.journeyDate, "PPP")}
                  </p>
                </div>
              </div>
            )}
            
            {inquiry.associatePartner && (
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Associate Partner</p>
                  <p className="font-medium">{inquiry.associatePartner.name}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center">
              <Tag className="h-5 w-5 mr-2 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Adults</p>
                <p className="font-medium">{inquiry.numAdults}</p>
              </div>
            </div>
            
            {(inquiry.numChildrenAbove11 > 0 || inquiry.numChildren5to11 > 0 || inquiry.numChildrenBelow5 > 0) && (
              <div className="flex items-center">
                <Tag className="h-5 w-5 mr-2 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Children</p>
                  <p className="font-medium">
                    {inquiry.numChildrenAbove11 > 0 && `${inquiry.numChildrenAbove11} above 11, `}
                    {inquiry.numChildren5to11 > 0 && `${inquiry.numChildren5to11} (5-11 years), `}
                    {inquiry.numChildrenBelow5 > 0 && `${inquiry.numChildrenBelow5} below 5`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {inquiry.remarks && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="font-medium mb-2">Remarks</h3>
                <p className="text-gray-700">{inquiry.remarks}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <Tabs defaultValue="actions" className="w-full">
        <TabsList>
          <TabsTrigger value="actions">Actions History</TabsTrigger>
          <TabsTrigger value="packages">Tour Packages</TabsTrigger>
        </TabsList>
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Inquiry Actions</CardTitle>
              <CardDescription>
                History of all actions taken for this inquiry
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inquiry.actions?.length > 0 ? (
                <div className="space-y-4">
                  {inquiry.actions.map((action: any) => (
                    <div key={action.id} className="border-l-2 border-primary pl-4 pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{action.actionType}</p>
                          <p className="text-sm text-gray-700">{action.remarks}</p>
                        </div>                        <p className="text-sm text-gray-500">
                          {formatLocalDate(action.actionDate, "PPp")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No actions recorded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle>Tour Packages</CardTitle>
              <CardDescription>
                Tour packages created for this inquiry
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inquiry.tourPackageQueries?.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {inquiry.tourPackageQueries.map((pkg: any) => (
                    <Card key={pkg.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{pkg.tourPackageQueryName || "Tour Package"}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {pkg.numDaysNight && (
                            <div>
                              <p className="text-gray-500">Duration</p>
                              <p className="font-medium">{pkg.numDaysNight}</p>
                            </div>
                          )}
                          {pkg.tourStartsFrom && (
                            <div>
                              <p className="text-gray-500">Start Date</p>                              <p className="font-medium">
                                {formatLocalDate(pkg.tourStartsFrom, "MMM d, yyyy")}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="mt-3">
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => window.open(`/tourPackageQuery/${pkg.id}`, '_blank')}
                          >
                            View Package
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No tour packages created yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
