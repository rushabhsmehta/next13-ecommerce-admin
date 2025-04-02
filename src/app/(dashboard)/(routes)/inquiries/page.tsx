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

  if (isAssociateDomain) {
    try {
      const { userId } = auth();
      if (userId) {
        const user = await clerkClient.users.getUser(userId);
        if (user?.emailAddresses?.length > 0) {
          const email = user.emailAddresses[0].emailAddress;

          const associate = await prismadb.associatePartner.findFirst({
            where: { email }
          });

          if (associate) {
            associateId = associate.id;
          } else {
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
      console.error("Error identifying associate:", error);
    }
  }

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
