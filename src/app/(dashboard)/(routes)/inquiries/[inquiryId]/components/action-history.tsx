"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import axios from "axios";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash } from "lucide-react";
import { AlertModal } from "@/components/modals/alert-modal";

interface ActionHistoryProps {
  inquiryId: string;
  actions: {
    id: string;
    actionType: string;
    remarks: string;
    actionDate: Date;
  }[];
}

export const ActionHistory: React.FC<ActionHistoryProps> = ({
  inquiryId,
  actions,
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState("");
  const [remarks, setRemarks] = useState("");
  const [actionDate, setActionDate] = useState<Date>(new Date());
  
  // For deletion confirmation
  const [open, setOpen] = useState(false);
  const [deletingActionId, setDeletingActionId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setIsLoading(true);
      await fetch(`/api/inquiries/${inquiryId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          actionType,
          remarks,
          actionDate,
        }),
      });
      toast.success("Action added successfully");
      setActionType("");
      setRemarks("");
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async () => {
    if (!deletingActionId) return;
    
    try {
      setDeleteLoading(true);
      await axios.delete(`/api/inquiries/${inquiryId}/actions/${deletingActionId}`);
      toast.success("Action deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting action:", error);
      toast.error("Failed to delete action");
    } finally {
      setDeleteLoading(false);
      setOpen(false);
      setDeletingActionId(null);
    }
  };

  // Helper function to get action type color
  const getActionTypeColor = (type: string) => {
    switch (type) {
      case "CALL":
        return "border-green-500 bg-green-50";
      case "MESSAGE":
        return "border-blue-500 bg-blue-50";
      case "EMAIL":
        return "border-yellow-500 bg-yellow-50";
      case "MEETING":
        return "border-purple-500 bg-purple-50";
      default:
        return "border-gray-500 bg-gray-50";
    }
  };

  return (
    <div className="space-y-6">
      <AlertModal 
        isOpen={open} 
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={deleteLoading}
      />
      
      <div className="font-medium text-lg">Action History</div>
      
      {/* Add new action form - responsive layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Select
          value={actionType}
          onValueChange={setActionType}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CALL">Call</SelectItem>
            <SelectItem value="MESSAGE">Message</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="MEETING">Meeting</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              {actionDate ? format(actionDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={actionDate}
              onSelect={(date) => date && setActionDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="sm:col-span-2 md:col-span-1">
          <Textarea
            placeholder="Enter remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="h-full min-h-[80px]"
          />
        </div>

        <div className="sm:col-span-2 md:col-span-1">
          <Button 
            disabled={isLoading || !actionType || !remarks} 
            onClick={onSubmit}
            className="w-full"
          >
            Add Action
          </Button>
        </div>
      </div>

      {/* Action history list - responsive layout */}
      <div className="space-y-4">
        {actions.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            No actions recorded yet.
          </div>
        ) : (
          actions.map((action) => (
            <div 
              key={action.id}
              className={`border-l-4 rounded-lg p-4 ${getActionTypeColor(action.actionType)} relative`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="font-medium mr-2">
                    {action.actionType}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1 sm:mt-0">
                  {format(new Date(action.actionDate), "PPP")}
                </div>
              </div>
              <div className="text-sm mt-1">
                {action.remarks}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => {
                  setDeletingActionId(action.id);
                  setOpen(true);
                }}
              >
                <Trash className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
