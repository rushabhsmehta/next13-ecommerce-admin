"use client";

import { InquiryStaffAssignment } from "@/components/inquiry-staff-assignment";

interface InquiryStaffAssignmentWrapperProps {
  inquiryId: string;
  assignedStaffId: string | null;
  assignedStaffAt: string | null;
}

export function InquiryStaffAssignmentWrapper({
  inquiryId,
  assignedStaffId,
  assignedStaffAt,
}: InquiryStaffAssignmentWrapperProps) {
  const handleAssignmentChange = () => {
    console.log("Assignment changed");
    // Add logic to refresh data or perform other actions if needed
  };

  return (
    <InquiryStaffAssignment
      inquiryId={inquiryId}
      assignedStaffId={assignedStaffId}
      assignedStaffAt={assignedStaffAt}
      onAssignmentChange={handleAssignmentChange}
    />
  );
}
