import prismadb from "@/lib/prismadb";
import { TravelUsersClient } from "./components/travel-users-client";

export const dynamic = "force-dynamic";

export default async function TravelUsersPage() {
  const users = await prismadb.travelAppUser.findMany({
    include: {
      _count: {
        select: {
          chatMemberships: { where: { isActive: true } },
          chatMessages: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <TravelUsersClient users={users} />;
}
