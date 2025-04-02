import { InquiriesClient } from "./components/client";
import prismadb from "@/lib/prismadb";
import { headers } from "next/headers";
import { auth, clerkClient } from "@clerk/nextjs";
import { format } from "date-fns";
import { InquiryColumn } from "./components/columns";

const InquiriesPage = async ({ searchParams }: { searchParams: any }) => {
  const headersList = headers();
  const host = headersList.get("host") || "";
  const isAssociateDomain = host === "associate.aagamholidays.com";
  
  console.log(`[InquiriesPage] Host: ${host}, isAssociateDomain: ${isAssociateDomain}`);

  const organization = await prismadb.organization.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  const associates = await prismadb.associatePartner.findMany({
    orderBy: {
      name: "asc",
    },
  });

  // Get the associate ID from search params or user's email if on associate domain
  let associateId = searchParams.associateId;
  console.log(`[InquiriesPage] Initial associateId from searchParams: ${associateId}`);

  if (isAssociateDomain) {
    try {
      const { userId } = auth();
      console.log(`[InquiriesPage] Auth userId: ${userId}`);
      
      if (userId) {
        const user = await clerkClient.users.getUser(userId);
        console.log(`[InquiriesPage] Found Clerk user:`, {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          emailsCount: user.emailAddresses?.length || 0
        });
        
        if (user?.emailAddresses?.length > 0) {
          const email = user.emailAddresses[0].emailAddress;
          console.log(`[InquiriesPage] User email: ${email}`);

          const associate = await prismadb.associatePartner.findFirst({
            where: { email }
          });
          
          if (associate) {
            console.log(`[InquiriesPage] Found matching associate partner:`, {
              id: associate.id,
              name: associate.name,
              email: associate.email
            });
            associateId = associate.id;
          } else {
            console.log(`[InquiriesPage] No associate partner found with email: ${email}`);
            // Log all associates for debugging
            console.log(`[InquiriesPage] Available associates:`, 
              associates.map(a => ({ id: a.id, name: a.name, email: a.email }))
            );
            
            // No matching associate found for this email
            return (
              <InquiriesClient
                data={[]}
                associates={associates}
                organization={organization}
                isAssociateDomain={isAssociateDomain}
              />
            );
          }
        }
      }
    } catch (error) {
      console.error("[InquiriesPage] Error identifying associate:", error);
    }
  }

  console.log(`[InquiriesPage] Final associateId for query: ${associateId}`);

  // Query inquiries with the associate filter if applicable
  const inquiries = await prismadb.inquiry.findMany({
    where: {
      ...(associateId && { associatePartnerId: associateId }),
    },
    include: {
      location: true,
      associatePartner: true,
      tourPackageQueries: true,
      actions: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  
  console.log(`[InquiriesPage] Found ${inquiries.length} inquiries for associateId: ${associateId}`);

  // Transform the inquiries to match the InquiryColumn type
  const formattedInquiries: InquiryColumn[] = inquiries.map((inquiry) => {
    // Format the actions into actionHistory format
    const actionHistory = inquiry.actions.map((action) => ({
      status: action.actionType || "",
      remarks: action.remarks || "",
      timestamp: action.actionDate.toISOString(),
      type: action.actionType || "NOTE",
    }));

    return {
      id: inquiry.id,
      customerName: inquiry.customerName,
      customerMobileNumber: inquiry.customerMobileNumber,
      location: inquiry.location?.label || "Unknown",
      associatePartner: inquiry.associatePartner?.name || "None",
      status: inquiry.status,
      journeyDate: inquiry.journeyDate ? format(new Date(inquiry.journeyDate), "dd MMM yyyy") : "Not set",
      tourPackageQueries: inquiry.tourPackageQueries || [],
      actionHistory: actionHistory,
    };
  });

  return (
    <InquiriesClient
      data={formattedInquiries}
      associates={associates}
      organization={organization}
      isAssociateDomain={isAssociateDomain}
    />
  );
};

export default InquiriesPage;
