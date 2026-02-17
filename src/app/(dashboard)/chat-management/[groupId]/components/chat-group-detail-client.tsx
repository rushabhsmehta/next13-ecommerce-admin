"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Users,
  UserPlus,
  Shield,
} from "lucide-react";
import Link from "next/link";

interface TravelUser {
  id: string;
  name: string;
  email: string;
  isApproved: boolean;
}

interface Member {
  id: string;
  role: string;
  isActive: boolean;
  travelAppUser: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    isApproved: boolean;
  };
}

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  tourPackageQueryId: string | null;
  tourStartDate: Date | string | null;
  tourEndDate: Date | string | null;
  isActive: boolean;
  members: Member[];
  _count: { messages: number };
}

interface ChatGroupDetailClientProps {
  group: ChatGroup | null;
  travelUsers: TravelUser[];
}

export function ChatGroupDetailClient({
  group,
  travelUsers,
}: ChatGroupDetailClientProps) {
  const router = useRouter();
  const isNew = !group;

  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [tourPackageQueryId, setTourPackageQueryId] = useState(
    group?.tourPackageQueryId || ""
  );
  const [tourStartDate, setTourStartDate] = useState(
    group?.tourStartDate
      ? new Date(group.tourStartDate).toISOString().split("T")[0]
      : ""
  );
  const [tourEndDate, setTourEndDate] = useState(
    group?.tourEndDate
      ? new Date(group.tourEndDate).toISOString().split("T")[0]
      : ""
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("TOURIST");
  const [saving, setSaving] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  const handleSaveGroup = async () => {
    if (!name.trim()) return;
    setSaving(true);

    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        tourPackageQueryId: tourPackageQueryId || null,
        tourStartDate: tourStartDate || null,
        tourEndDate: tourEndDate || null,
      };

      if (isNew) {
        const res = await fetch("/api/chat/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          router.push(`/chat-management/${created.id}`);
          router.refresh();
        }
      } else {
        // For existing groups, we'd need a PATCH endpoint
        // For now, navigate back
        router.push("/chat-management");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to save group:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !group) return;
    setAddingMember(true);

    try {
      const res = await fetch(`/api/chat/groups/${group.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travelAppUserId: selectedUserId,
          role: selectedRole,
        }),
      });
      if (res.ok) {
        setSelectedUserId("");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to add member:", error);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!group) return;
    if (!confirm("Remove this member from the group?")) return;

    try {
      await fetch(
        `/api/chat/groups/${group.id}/members?memberId=${memberId}`,
        { method: "DELETE" }
      );
      router.refresh();
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const existingMemberIds = group?.members.map((m) => m.travelAppUser.id) || [];
  const availableUsers = travelUsers.filter(
    (u) => !existingMemberIds.includes(u.id)
  );

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/chat-management"
            className="p-2 hover:bg-accent rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isNew ? "Create Chat Group" : group.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isNew
                ? "Set up a new tour group chat"
                : `${group._count.messages} messages • ${group.members.length} members`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Group Details Form */}
          <div className="space-y-4 rounded-lg border p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" /> Group Details
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Kashmir Tour - March 2025"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for the group"
                rows={3}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tour Package Query ID
              </label>
              <input
                type="text"
                value={tourPackageQueryId}
                onChange={(e) => setTourPackageQueryId(e.target.value)}
                placeholder="Link to tour package query (optional)"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tour Start Date</label>
                <input
                  type="date"
                  value={tourStartDate}
                  onChange={(e) => setTourStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tour End Date</label>
                <input
                  type="date"
                  value={tourEndDate}
                  onChange={(e) => setTourEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <button
              onClick={handleSaveGroup}
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : isNew ? "Create Group" : "Save Changes"}
            </button>
          </div>

          {/* Members Management */}
          {!isNew && (
            <div className="space-y-4 rounded-lg border p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Members
              </h3>

              {/* Add Member */}
              <div className="flex gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                      {!u.isApproved && " [Pending]"}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="TOURIST">Tourist</option>
                  <option value="COMPANION">Companion</option>
                  <option value="OPERATIONS">Operations</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUserId || addingMember}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Members List */}
              <div className="space-y-2 mt-4">
                {group.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No members added yet.
                  </p>
                ) : (
                  group.members.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        member.isActive ? "bg-background" : "bg-muted/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          {member.role === "ADMIN" || member.role === "OPERATIONS" ? (
                            <Shield className="w-4 h-4 text-primary" />
                          ) : (
                            <span className="text-xs font-medium">
                              {member.travelAppUser.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.travelAppUser.name}
                            {!member.travelAppUser.isApproved && (
                              <span className="ml-2 text-xs text-yellow-600">
                                (Pending Approval)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.travelAppUser.email} •{" "}
                            <span className="capitalize">
                              {member.role.toLowerCase()}
                            </span>
                          </p>
                        </div>
                      </div>
                      {member.isActive && (
                        <button
                          onClick={() =>
                            handleRemoveMember(member.travelAppUser.id)
                          }
                          className="p-1.5 hover:bg-destructive/10 rounded-md text-destructive"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
