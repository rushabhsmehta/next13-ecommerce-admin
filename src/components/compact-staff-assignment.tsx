"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useAssociatePartner } from "@/hooks/use-associate-partner";

interface OperationalStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface AssociatePartner {
  id: string;
  name: string;
  email: string | null;
  gmail: string | null;
}

interface CompactStaffAssignmentProps {
  inquiryId: string;
  assignedStaffId: string | null;
  onAssignmentComplete?: () => void;
  className?: string;
}

export function CompactStaffAssignment({
  inquiryId,
  assignedStaffId,
  onAssignmentComplete,
  className
}: CompactStaffAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<OperationalStaff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [isAssociatePartner, setIsAssociatePartner] = useState(false);
    // Use the shared hook to check if current user is an associate partner
  const { isAssociatePartner: isAssociate } = useAssociatePartner();
  
  useEffect(() => {
    setIsAssociatePartner(isAssociate);
  }, [isAssociate]);

  // Don't render the component if user is an associate partner
  if (isAssociatePartner) {
    return null;
  }

  // Fetch staff members when popover is opened
  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);

    if (newOpen && staffList.length === 0) {
      try {
        setStaffLoading(true);
        const response = await fetch('/api/operational-staff?active=true');
        
        if (!response.ok) {
          throw new Error('Failed to fetch operational staff');
        }
        
        const data = await response.json();
        setStaffList(data);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast.error('Failed to load staff list');
      } finally {
        setStaffLoading(false);
      }
    }
  };

  const handleAssign = async (staffId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inquiries/${inquiryId}/assign-staff`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staffId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign staff');
      }

      toast.success('Staff assigned successfully');
      setOpen(false);
      
      // Notify parent component of change
      if (onAssignmentComplete) {
        onAssignmentComplete();
      }
    } catch (error) {
      console.error('Error assigning staff:', error);
      toast.error('Failed to assign staff');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inquiries/${inquiryId}/unassign-staff`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to unassign staff');
      }

      toast.success('Staff unassigned successfully');
      
      // Notify parent component of change
      if (onAssignmentComplete) {
        onAssignmentComplete();
      }
    } catch (error) {
      console.error('Error unassigning staff:', error);
      toast.error('Failed to unassign staff');
    } finally {
      setLoading(false);
    }
  };

  // Find the currently assigned staff member's name
  const assignedStaff = staffList.find(staff => staff.id === assignedStaffId);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            className={cn(
              "justify-between truncate max-w-[200px]",
              !assignedStaffId && "text-muted-foreground"
            )}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <UserRound className="h-3 w-3 mr-1" />
            )}
            {assignedStaffId ? assignedStaff?.name || "Loading..." : "Assign staff"}
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[250px]">
          <Command>
            <CommandInput placeholder="Search staff..." />
            <CommandList>
            <CommandEmpty>
              {staffLoading ? "Loading..." : "No staff found"}
            </CommandEmpty>
            <CommandGroup>
              {staffLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {assignedStaffId && (
                    <CommandItem
                      key="unassign"
                      onSelect={handleUnassign}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      Unassign current staff
                    </CommandItem>
                  )}
                  {staffList.map((staff) => (
                    <CommandItem
                      key={staff.id}
                      value={staff.id}
                      onSelect={() => handleAssign(staff.id)}
                    >
                      <UserRound className="mr-2 h-3 w-3" />
                      <span className="truncate">{staff.name}</span>
                      <Check
                        className={cn(
                          "ml-auto h-3 w-3",
                          staff.id === assignedStaffId
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </>
              )}
            </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
