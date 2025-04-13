"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

interface OperationalStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface InquiryStaffAssignmentProps {
  inquiryId: string;
  assignedStaffId: string | null;
  assignedStaffAt: string | null;
  className?: string;
  onAssignmentChange?: () => void;
}

export function InquiryStaffAssignment({
  inquiryId,
  assignedStaffId,
  assignedStaffAt,
  className,
  onAssignmentChange
}: InquiryStaffAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<OperationalStaff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

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
        toast.error('Failed to load operational staff');
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

      toast.success('Inquiry assigned successfully');
      setOpen(false);
      
      // Notify parent component of change
      if (onAssignmentChange) {
        onAssignmentChange();
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

      toast.success('Inquiry unassigned successfully');
      
      // Notify parent component of change
      if (onAssignmentChange) {
        onAssignmentChange();
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
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none">
          Assigned Operational Staff
        </label>
        
        {assignedStaffId && (
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={handleUnassign}
            className="h-8 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Unassign'
            )}
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "justify-between w-full",
                !assignedStaffId && "text-muted-foreground"
              )}
            >
              {assignedStaffId ? assignedStaff?.name || "Loading..." : "Assign to staff"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px]">
            <Command>
              <CommandInput placeholder="Search staff..." />
              <CommandEmpty>
                {staffLoading ? "Loading..." : "No staff found"}
              </CommandEmpty>
              <CommandGroup>
                {staffLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  staffList.map((staff) => (
                    <CommandItem
                      key={staff.id}
                      value={staff.id}
                      onSelect={() => handleAssign(staff.id)}
                    >
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{staff.name}</span>
                          <span className="text-xs text-muted-foreground">{staff.email}</span>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          staff.id === assignedStaffId
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {assignedStaffId && assignedStaffAt && (
        <div className="text-xs text-muted-foreground">
          Assigned on {format(new Date(assignedStaffAt), "PPp")}
        </div>
      )}
    </div>
  );
}
