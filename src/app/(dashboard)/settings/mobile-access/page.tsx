import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import prismadb from "@/lib/prismadb";
import { MobileAccessClient } from "./components/mobile-access-client";

const MobileAccessPage = async () => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tokenRecord = await prismadb.adminMobileToken.findFirst({
    where: { userId },
    select: {
      id: true,
      label: true,
      userName: true,
      pushToken: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading
          title="Mobile Admin Access"
          description="Generate a token to log in to the Travel mobile app as admin and access WhatsApp chats"
        />
        <Separator />
        <MobileAccessClient tokenRecord={tokenRecord} />
      </div>
    </div>
  );
};

export default MobileAccessPage;
