"use client";

import { PeriodFilter } from "./period-filter";
import { StatusFilter } from "./status-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export interface InquiriesFiltersContentProps {
  isAssociateUser: boolean;
  operationalStaffs?: { id: string; name: string }[];
  localAssignedStaffId: string;
  onAssignedStaffChange: (value: string) => void;
  followUpsOnly: boolean;
  onToggleFollowUpsOnly: (checked: boolean) => void;
  noTourPackageQuery: boolean;
  onToggleNoTPQ: (checked: boolean) => void;
  isPending: boolean;
  localAssociateId: string;
  onAssociateChange: (value: string) => void;
  associates: { id: string; name: string }[];
}

export function InquiriesFiltersContent({
  isAssociateUser,
  operationalStaffs,
  localAssignedStaffId,
  onAssignedStaffChange,
  followUpsOnly,
  onToggleFollowUpsOnly,
  noTourPackageQuery,
  onToggleNoTPQ,
  isPending,
  localAssociateId,
  onAssociateChange,
  associates,
}: InquiriesFiltersContentProps) {
  return (
    <div className="flex flex-col space-y-4 py-4">
      <PeriodFilter />
      <StatusFilter />
      {!isAssociateUser && operationalStaffs && (
        <Select
          value={localAssignedStaffId}
          onValueChange={onAssignedStaffChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Assigned Staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Staff</SelectItem>
            {operationalStaffs.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="followups-only"
          checked={followUpsOnly}
          onCheckedChange={(v) => onToggleFollowUpsOnly(!!v)}
        />
        <label htmlFor="followups-only" className="text-sm">
          Follow-ups only
        </label>
        {isPending && (
          <span className="text-xs text-muted-foreground">Updating…</span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="no-tpq"
          checked={noTourPackageQuery}
          onCheckedChange={(v) => onToggleNoTPQ(!!v)}
        />
        <label htmlFor="no-tpq" className="text-sm">
          No Tour Package Query
        </label>
        {isPending && (
          <span className="text-xs text-muted-foreground">Updating…</span>
        )}
      </div>
      {!isAssociateUser && (
        <Select value={localAssociateId} onValueChange={onAssociateChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Associate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Associates</SelectItem>
            {associates.map((associate) => (
              <SelectItem key={associate.id} value={associate.id}>
                {associate.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
