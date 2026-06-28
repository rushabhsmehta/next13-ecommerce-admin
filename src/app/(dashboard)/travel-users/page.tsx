import prismadb from "@/lib/prismadb";
import { TravelUsersClient } from "./components/travel-users-client";
import { MarketingPushPanel } from "./components/marketing-push-panel";

export const dynamic = "force-dynamic";

export default async function TravelUsersPage() {
  const [users, activeDeviceCount, broadcasts] = await Promise.all([
    prismadb.travelAppUser.findMany({
      include: {
        _count: {
          select: {
            chatMemberships: { where: { isActive: true } },
            chatMessages: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prismadb.devicePushToken.count({
      where: { isActive: true, marketingOptIn: true, appVariant: "public" },
    }),
    prismadb.marketingPushBroadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const formattedBroadcasts = broadcasts.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <div className="flex-col">
      <div className="space-y-4 p-4">
        <MarketingPushPanel
          initialActiveDeviceCount={activeDeviceCount}
          initialBroadcasts={formattedBroadcasts}
        />
        <TravelUsersClient users={users} />
      </div>
    </div>
  );
}
