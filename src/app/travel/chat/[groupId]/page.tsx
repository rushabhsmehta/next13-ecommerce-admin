import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { travelHref } from "@/lib/travel-paths";
import { getServerTravelBasePath } from "@/lib/travel-paths-server";
import { ChatRoomClient } from "./components/chat-room-client";

export async function generateMetadata(props: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await props.params;
  const group = await prismadb.chatGroup.findUnique({
    where: { id: groupId },
    select: { name: true },
  });
  return {
    title: group?.name ? `${group.name} | Aagam Holidays` : "Chat | Aagam Holidays",
  };
}

export default async function TravelChatRoomPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await props.params;
  const basePath = await getServerTravelBasePath();
  const chatPath = travelHref("/chat", basePath);
  const loginPath = travelHref(
    `/login?from=${encodeURIComponent(travelHref(`/chat/${groupId}`, basePath))}`,
    basePath
  );
  const packagesPath = travelHref("/packages", basePath);

  const { userId } = await auth();
  if (!userId) redirect(loginPath);

  const travelUser = await prismadb.travelAppUser.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, isApproved: true },
  });

  if (!travelUser) redirect(loginPath);
  if (!travelUser.isApproved) redirect(chatPath);

  const membership = await prismadb.chatGroupMember.findUnique({
    where: {
      chatGroupId_travelAppUserId: {
        chatGroupId: groupId,
        travelAppUserId: travelUser.id,
      },
    },
    include: {
      chatGroup: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });

  if (!membership?.isActive || !membership.chatGroup.isActive) {
    notFound();
  }

  return (
    <ChatRoomClient
      groupId={groupId}
      groupName={membership.chatGroup.name}
      myUserId={travelUser.id}
      chatListPath={chatPath}
      packagesPath={packagesPath}
    />
  );
}
