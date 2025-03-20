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

  return (
    <div className="space-y-4">
      <div className="font-medium text-lg">Action History</div>
      
      {/* Add new action form */}
      <div className="grid grid-cols-4 gap-4">
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
            <Button variant="outline">
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

        <Textarea
          placeholder="Enter remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <Button 
          disabled={isLoading || !actionType || !remarks} 
          onClick={onSubmit}
        >
          Add Action
        </Button>
      </div>

      {/* Action history list */}
      <div className="space-y-4">
        {actions.map((action) => (
          <div 
            key={action.id}
            className="flex items-start space-x-4 border rounded-lg p-4"
          >
            <div className="min-w-[100px] font-medium">
              {action.actionType}
            </div>
            <div className="flex-1">
              {action.remarks}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(action.actionDate), "PPP")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
