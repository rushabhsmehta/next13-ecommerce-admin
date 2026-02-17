"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Plus,
  Check,
  X,
  Shield,
  MessageCircle,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";

interface TravelUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isApproved: boolean;
  isActive: boolean;
  clerkUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    chatMemberships: number;
    chatMessages: number;
  };
}

export function TravelUsersClient({ users }: { users: TravelUser[] }) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreateUser = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/travel-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || null,
        }),
      });

      if (res.ok) {
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        setShowAddForm(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create user:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleApproval = async (userId: string, approve: boolean) => {
    try {
      await fetch(`/api/travel-users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: approve }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const handleToggleActive = async (userId: string, active: boolean) => {
    try {
      await fetch(`/api/travel-users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const approvedCount = users.filter((u) => u.isApproved).length;
  const pendingCount = users.filter((u) => !u.isApproved && u.isActive).length;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Travel App Users
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage user access to the travel app and chat
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="w-4 h-4" /> Total Users
            </div>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <UserCheck className="w-4 h-4 text-green-600" /> Approved
            </div>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <UserX className="w-4 h-4 text-yellow-600" /> Pending Approval
            </div>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <div className="rounded-lg border p-6 space-y-4 bg-muted/50">
            <h3 className="text-lg font-semibold">Add New Travel User</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateUser}
                disabled={saving || !newName.trim() || !newEmail.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create User"}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  User
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Groups
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Messages
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Joined
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No travel app users yet.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-b hover:bg-muted/50 ${!user.isActive ? "opacity-50" : ""}`}
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-xs text-muted-foreground">
                            {user.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                            user.isApproved
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {user.isApproved ? "Approved" : "Pending"}
                        </span>
                        {!user.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 w-fit">
                            Deactivated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {user._count.chatMemberships}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                        {user._count.chatMessages}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {!user.isApproved ? (
                          <button
                            onClick={() => handleToggleApproval(user.id, true)}
                            className="p-1.5 hover:bg-green-100 rounded-md text-green-600"
                            title="Approve user"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleApproval(user.id, false)}
                            className="p-1.5 hover:bg-yellow-100 rounded-md text-yellow-600"
                            title="Revoke approval"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleToggleActive(user.id, !user.isActive)
                          }
                          className={`p-1.5 rounded-md ${
                            user.isActive
                              ? "hover:bg-red-100 text-red-600"
                              : "hover:bg-green-100 text-green-600"
                          }`}
                          title={user.isActive ? "Deactivate" : "Activate"}
                        >
                          {user.isActive ? (
                            <X className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      </div>
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
