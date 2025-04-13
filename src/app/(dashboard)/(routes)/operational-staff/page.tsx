"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Edit2, Loader2, PlusCircle, Search, TrashIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface OperationalStaff {
  id: string;
  name: string;
  email: string;
  role: "OPERATIONS" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function OperationalStaffPage() {
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<OperationalStaff[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<OperationalStaff | null>(null);
  const router = useRouter();
  
  // Form state for creating new staff
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"OPERATIONS" | "ADMIN">("OPERATIONS");
  const [isActive, setIsActive] = useState(true);
  
  // Form state for editing staff
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"OPERATIONS" | "ADMIN">("OPERATIONS");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editId, setEditId] = useState("");

  // Load staff list if not loaded
  const loadStaff = async () => {
    if (isLoaded && !loading) return;
    
    try {
      setLoading(true);
      const res = await fetch("/api/operational-staff");
      
      if (!res.ok) {
        throw new Error("Failed to load operational staff");
      }
      
      const data = await res.json();
      setStaffList(data);
      setIsLoaded(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load operational staff");
    } finally {
      setLoading(false);
    }
  };
  
  // Load staff data when component renders
  if (!isLoaded && !loading) {
    loadStaff();
  }
  
  // Create new operational staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const res = await fetch("/api/operational-staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          isActive
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to create operational staff");
      }
      
      const newStaff = await res.json();
      
      // Update the staff list with the new staff member
      setStaffList(prev => [newStaff, ...prev]);
      
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setRole("OPERATIONS");
      setIsActive(true);
      
      // Close dialog
      setIsDialogOpen(false);
      
      toast.success("Operational staff member created successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create operational staff");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle edit staff form submission
  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const payload: any = {
        name: editName,
        email: editEmail,
        role: editRole,
        isActive: editIsActive
      };
      
      // Only include password in the payload if it's not empty
      if (editPassword.trim()) {
        payload.password = editPassword;
      }
      
      const res = await fetch(`/api/operational-staff/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        throw new Error("Failed to update operational staff");
      }
      
      const updatedStaff = await res.json();
      
      // Update the staff list
      setStaffList(prev => 
        prev.map(staff => 
          staff.id === editId ? updatedStaff : staff
        )
      );
      
      // Close dialog
      setIsEditDialogOpen(false);
      
      toast.success("Operational staff member updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update operational staff");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Open edit dialog and populate with staff data
  const openEditDialog = (staff: OperationalStaff) => {
    setEditId(staff.id);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditPassword("");
    setEditRole(staff.role);
    setEditIsActive(staff.isActive);
    setCurrentStaff(staff);
    setIsEditDialogOpen(true);
  };
  
  // Toggle staff active status
  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/operational-staff/${staffId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !currentStatus
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to update staff status");
      }
      
      // Update local state
      setStaffList(prev => 
        prev.map(staff => 
          staff.id === staffId 
            ? { ...staff, isActive: !currentStatus } 
            : staff
        )
      );
      
      toast.success(`Staff ${!currentStatus ? "activated" : "deactivated"} successfully`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update staff status");
    }
  };
  
  // Delete staff member
  const deleteStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/operational-staff/${staffId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete staff member");
      }
      
      // Update local state
      setStaffList(prev => prev.filter(staff => staff.id !== staffId));
      
      toast.success("Staff member deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete staff member");
    }
  };
  
  // Create temporary password
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(password);
  };
  
  // Create temporary password for edit form
  const generateEditRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditPassword(password);
  };
  
  // Filter staff list based on search term
  const filteredStaff = staffList.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Operational Staff Management</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateStaff}>
              <DialogHeader>
                <DialogTitle>Create New Operational Staff</DialogTitle>
                <DialogDescription>
                  Create a new account for operational staff members.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Password
                  </Label>
                  <div className="col-span-3 flex gap-2">
                    <Input
                      id="password"
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex-1"
                      required
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={generateRandomPassword}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select value={role} onValueChange={(value: "OPERATIONS" | "ADMIN") => setRole(value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPERATIONS">Operations</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Active
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="status"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <Label htmlFor="status">
                      {isActive ? "Enabled" : "Disabled"}
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Staff"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleEditStaff}>
              <DialogHeader>
                <DialogTitle>Edit Operational Staff</DialogTitle>
                <DialogDescription>
                  Update information for this staff member.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editEmail" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editPassword" className="text-right">
                    Password
                  </Label>
                  <div className="col-span-3 flex gap-2">
                    <Input
                      id="editPassword"
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="flex-1"
                      placeholder="Leave blank to keep current password"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={generateEditRandomPassword}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editRole" className="text-right">
                    Role
                  </Label>
                  <Select value={editRole} onValueChange={(value: "OPERATIONS" | "ADMIN") => setEditRole(value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPERATIONS">Operations</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editStatus" className="text-right">
                    Active
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="editStatus"
                      checked={editIsActive}
                      onCheckedChange={setEditIsActive}
                    />
                    <Label htmlFor="editStatus">
                      {editIsActive ? "Enabled" : "Disabled"}
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Staff"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center border rounded-md px-3 py-2 max-w-sm">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search staff..."
            className="border-0 focus-visible:ring-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Operational Staff</CardTitle>
          <CardDescription>
            Manage operational staff members who can handle inquiries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No operational staff members found. Create one to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>{staff.email}</TableCell>
                      <TableCell>{staff.role}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`h-2.5 w-2.5 rounded-full mr-2 ${staff.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          {staff.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(staff.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(staff)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStaffStatus(staff.id, staff.isActive)}
                          >
                            {staff.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteStaff(staff.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
