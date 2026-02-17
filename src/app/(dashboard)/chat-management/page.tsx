import prismadb from "@/lib/prismadb";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Users, MessageCircle, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChatManagementPage() {
  const groups = await prismadb.chatGroup.findMany({
    include: {
      _count: {
        select: { members: true, messages: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Chat Management</h2>
            <p className="text-sm text-muted-foreground">
              Manage tour group chats and members
            </p>
          </div>
          <Link
            href="/chat-management/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New Group
          </Link>
        </div>

        {/* Groups Table */}
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Group Name
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Members
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Messages
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Tour Dates
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No chat groups created yet.
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <Link
                        href={`/chat-management/${group.id}`}
                        className="font-medium hover:underline"
                      >
                        {group.name}
                      </Link>
                      {group.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {group.description}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {group._count.members}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                        {group._count.messages}
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      {group.tourStartDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(group.tourStartDate), "MMM d")}
                          {group.tourEndDate &&
                            ` - ${format(new Date(group.tourEndDate), "MMM d, yyyy")}`}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          group.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {group.isActive ? "Active" : "Closed"}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {format(new Date(group.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
