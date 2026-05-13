"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const ROLES = ["VIEWER", "OPERATIONS", "FINANCE", "ADMIN", "OWNER"] as const;

type MemberRow = {
  id: string;
  userId: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

interface OrganizationMembersSectionProps {
  organizationId: string;
}

export function OrganizationMembersSection({
  organizationId,
}: OrganizationMembersSectionProps) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [newUserId, setNewUserId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<(typeof ROLES)[number]>("VIEWER");
  const [adding, setAdding] = useState(false);

  const base = `/api/settings/organization/${organizationId}/members`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, roleRes] = await Promise.all([
        axios.get<{ members: MemberRow[] }>(base),
        axios.get<{ role: string | null }>("/api/me/role"),
      ]);
      setMembers(mRes.data.members);
      setMyRole(roleRes.data.role);
    } catch {
      toast.error("Could not load organization members.");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchMember = async (memberId: string, body: Record<string, unknown>) => {
    await axios.patch(`${base}/${memberId}`, body);
    await load();
    toast.success("Member updated.");
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim()) {
      toast.error("Clerk user id is required.");
      return;
    }
    setAdding(true);
    try {
      await axios.post(base, {
        userId: newUserId.trim(),
        role: newRole,
        ...(newEmail.trim() ? { email: newEmail.trim() } : {}),
      });
      toast.success("Member saved.");
      setNewUserId("");
      setNewEmail("");
      setNewRole("VIEWER");
      await load();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not save member.";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const roleOptionsForInvite = ROLES.filter((r) => r !== "OWNER" || myRole === "OWNER");

  return (
    <div className="space-y-6">
      <div>
        <Heading
          title="Organization members"
          description="Roles apply to this CRM organization. User id must be the Clerk user id (user_…) from the Clerk dashboard."
        />
      </div>
      <Separator />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={addMember} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Clerk user id</label>
              <Input
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="user_…"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email (optional)</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as (typeof ROLES)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptionsForInvite.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={adding}>
                {adding ? "Saving…" : "Add or update member"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clerk user id</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No members yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs">
                        {m.userId}
                      </TableCell>
                      <TableCell>{m.email ?? "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={m.role}
                          disabled={!m.isActive}
                          onValueChange={async (role) => {
                            if (role === "OWNER" && myRole !== "OWNER") {
                              toast.error("Only an owner can assign the OWNER role.");
                              return;
                            }
                            try {
                              await patchMember(m.id, { role });
                            } catch (err: unknown) {
                              const msg =
                                axios.isAxiosError(err) && err.response?.data?.error
                                  ? String(err.response.data.error)
                                  : "Update failed.";
                              toast.error(msg);
                            }
                          }}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.filter((r) => r !== "OWNER" || myRole === "OWNER").map(
                              (r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{m.isActive ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        {m.isActive ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  "Deactivate this member? They will lose access until reactivated."
                                )
                              ) {
                                return;
                              }
                              try {
                                await patchMember(m.id, { isActive: false });
                              } catch (err: unknown) {
                                const msg =
                                  axios.isAxiosError(err) && err.response?.data?.error
                                    ? String(err.response.data.error)
                                    : "Could not deactivate.";
                                toast.error(msg);
                              }
                            }}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              try {
                                await patchMember(m.id, { isActive: true });
                              } catch (err: unknown) {
                                const msg =
                                  axios.isAxiosError(err) && err.response?.data?.error
                                    ? String(err.response.data.error)
                                    : "Could not reactivate.";
                                toast.error(msg);
                              }
                            }}
                          >
                            Reactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
