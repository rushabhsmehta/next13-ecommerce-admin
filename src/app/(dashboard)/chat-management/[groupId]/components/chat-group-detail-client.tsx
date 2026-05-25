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
  Mail,
  X,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

interface PendingInvite {
  id: string;
  invitedName: string;
  invitedEmail: string | null;
  invitedPhone: string | null;
  role: string;
  createdAt: Date | string;
  invitedByUser: { id: string; name: string };
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
  pendingInvites: PendingInvite[];
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  OPERATIONS: "Operations",
  TOURIST: "Tourist",
  COMPANION: "Companion",
};

export function ChatGroupDetailClient({
  group,
  travelUsers,
  pendingInvites,
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
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState("TOURIST");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);

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
        // Editing existing groups is not yet supported
        window.alert("Editing existing chat groups is not yet supported. Your changes have not been saved.");
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
        toast.success("Member added to group.");
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to add member.");
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
      const res = await fetch(
        `/api/chat/groups/${group.id}/members?memberId=${memberId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Member removed.");
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to remove member.");
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member.");
    }
  };

  const handleSendInvite = async () => {
    if (!group) return;
    const name = inviteName.trim();
    const email = inviteEmail.trim();
    const phone = invitePhone.trim();
    if (!name) {
      toast.error("Invitee name is required.");
      return;
    }
    if (!email && !phone) {
      toast.error("Enter an email or phone number for the invite.");
      return;
    }

    setSendingInvite(true);
    try {
      const res = await fetch(`/api/chat/groups/${group.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitedName: name,
          invitedEmail: email || undefined,
          invitedPhone: phone || undefined,
          role: inviteRole,
        }),
      });
      if (res.ok) {
        setInviteName("");
        setInviteEmail("");
        setInvitePhone("");
        setInviteRole("TOURIST");
        toast.success("Invite sent. They will join when they sign up with that contact.");
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to send invite.");
      }
    } catch (error) {
      console.error("Failed to send invite:", error);
      toast.error("Failed to send invite.");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInvite = async (inviteId: string, invitedName: string) => {
    if (!group) return;
    if (!confirm(`Cancel invite for ${invitedName}?`)) return;

    setCancellingInviteId(inviteId);
    try {
      const res = await fetch(
        `/api/chat/groups/${group.id}/invites/${inviteId}`,
        { method: "PATCH" }
      );
      if (res.ok) {
        toast.success("Invite cancelled.");
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to cancel invite.");
      }
    } catch (error) {
      console.error("Failed to cancel invite:", error);
      toast.error("Failed to cancel invite.");
    } finally {
      setCancellingInviteId(null);
    }
  };

  const formatInviteContact = (invite: PendingInvite) => {
    const parts = [invite.invitedEmail, invite.invitedPhone].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "No contact details";
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
            <h1 className="text-3xl font-bold tracking-tight">
              {isNew ? "Create Chat Group" : group.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isNew
                ? "Set up a new tour group chat"
                : `${group._count.messages} messages • ${group.members.length} members${
                    pendingInvites.length > 0
                      ? ` • ${pendingInvites.length} pending invite${pendingInvites.length === 1 ? "" : "s"}`
                      : ""
                  }`}
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
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email}){!u.isApproved && " [Pending]"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOURIST">Tourist</SelectItem>
                    <SelectItem value="COMPANION">Companion</SelectItem>
                    <SelectItem value="OPERATIONS">Operations</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
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

        {!isNew && (
          <div className="space-y-4 rounded-lg border p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="w-5 h-5" /> Guest Invites
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Invite someone who is not yet in the app. They are added automatically when
                  they register with the matching email or phone.
                </p>
              </div>
              {pendingInvites.length > 0 && (
                <Badge variant="secondary">{pendingInvites.length} pending</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Guest name"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <input
                  type="text"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+91…"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <div className="flex gap-2">
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOURIST">Tourist</SelectItem>
                      <SelectItem value="COMPANION">Companion</SelectItem>
                      <SelectItem value="OPERATIONS">Operations</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={handleSendInvite}
                    disabled={sendingInvite || !inviteName.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    {sendingInvite ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              At least one of email or phone is required.
            </p>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Pending invites</h4>
              {pendingInvites.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg bg-muted/20">
                  No pending invites for this group.
                </p>
              ) : (
                <div className="rounded-md border divide-y">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{invite.invitedName}</p>
                          <Badge variant="outline" className="capitalize">
                            {ROLE_LABEL[invite.role] ?? invite.role.toLowerCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatInviteContact(invite)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Invited by {invite.invitedByUser.name} on{" "}
                          {format(new Date(invite.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleCancelInvite(invite.id, invite.invitedName)
                        }
                        disabled={cancellingInviteId === invite.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md disabled:opacity-50"
                        title="Cancel invite"
                      >
                        <X className="w-4 h-4" />
                        {cancellingInviteId === invite.id ? "Cancelling…" : "Cancel"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
