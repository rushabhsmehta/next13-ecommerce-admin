import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { ChatGroupDetailClient } from "./components/chat-group-detail-client";

export const dynamic = "force-dynamic";

export default async function ChatGroupDetailPage(
  props: {
    params: Promise<{ groupId: string }>;
  }
) {
  const params = await props.params;
  if (params.groupId === "new") {
    // Render new group form
    const travelUsers = await prismadb.travelAppUser.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, isApproved: true },
      orderBy: { name: "asc" },
    });
    return <ChatGroupDetailClient group={null} travelUsers={travelUsers} pendingInvites={[]} />;
  }

  const group = await prismadb.chatGroup.findUnique({
    where: { id: params.groupId },
    include: {
      members: {
        include: {
          travelAppUser: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
              isApproved: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      invites: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invitedName: true,
          invitedEmail: true,
          invitedPhone: true,
          role: true,
          createdAt: true,
          invitedByUser: { select: { id: true, name: true } },
        },
      },
      _count: { select: { messages: true } },
    },
  });

  if (!group) notFound();

  const travelUsers = await prismadb.travelAppUser.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, isApproved: true },
    orderBy: { name: "asc" },
  });

  const { invites, ...groupData } = group;

  return (
    <ChatGroupDetailClient
      group={groupData}
      travelUsers={travelUsers}
      pendingInvites={invites}
    />
  );
}
