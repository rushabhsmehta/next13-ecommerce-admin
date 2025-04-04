"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

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
              className={`border-l-4 rounded-lg p-4 ${getActionTypeColor(action.actionType)}`}
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};
