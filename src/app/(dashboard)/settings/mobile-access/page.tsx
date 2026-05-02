import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import prismadb from "@/lib/prismadb";
import { MobileAccessClient } from "./components/mobile-access-client";

const MobileAccessPage = async () => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tokenRecord = await prismadb.adminMobileToken.findUnique({
    where: { userId },
    select: {
      userId: true,
      userName: true,
      pushToken: true,
      updatedAt: true,
    },
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading
          title="Mobile Admin Access"
          description="Access WhatsApp live chat from the Aagam Holidays mobile app using your CRM Google account"
        />
        <Separator />
        <MobileAccessClient tokenRecord={tokenRecord} />
      </div>
    </div>
  );
};

export default MobileAccessPage;
