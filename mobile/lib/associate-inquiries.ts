import { request } from "@/lib/api";

export interface InquiryActionItem {
  id: string;
  actionType: string;
  remarks: string;
  actionDate: string;
  createdAt: string;
}

export interface AssociateInquiry {
  id: string;
  customerName: string;
  customerMobileNumber: string;
  locationId: string;
  status: string;
  journeyDate: string | null;
  nextFollowUpDate: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  location?: { id: string; label: string } | null;
  associatePartner?: { id: string; name: string } | null;
  actions?: InquiryActionItem[];
}

export interface AssociateInquiryInput {
  customerName: string;
  customerMobileNumber: string;
  locationId: string;
  journeyDate: string;
  numAdults?: number;
  remarks?: string;
  nextFollowUpDate?: string;
}

export interface AssociateInquiryUpdateInput {
  customerName: string;
  customerMobileNumber: string;
  locationId: string;
  journeyDate: string;
  status: string;
  numAdults?: number;
  remarks?: string;
  nextFollowUpDate?: string | null;
}

export interface LocationOption {
  id: string;
  label: string;
}

export function createAssociateInquiryClient(
  authRequest: <T = any>(
    endpoint: string,
    options?: {
      method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
      body?: any;
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    }
  ) => Promise<T>
) {
  return {
    listInquiries(): Promise<AssociateInquiry[]> {
      return authRequest<AssociateInquiry[]>("/api/inquiries");
    },
    getInquiry(inquiryId: string): Promise<AssociateInquiry | null> {
      return authRequest<AssociateInquiry | null>(`/api/inquiries/${inquiryId}`);
    },
    createInquiry(payload: AssociateInquiryInput): Promise<AssociateInquiry> {
      return authRequest<AssociateInquiry>("/api/inquiries", {
        method: "POST",
        body: payload,
      });
    },
    updateInquiry(inquiryId: string, payload: AssociateInquiryUpdateInput): Promise<AssociateInquiry> {
      return authRequest<AssociateInquiry>(`/api/inquiries/${inquiryId}`, {
        method: "PATCH",
        body: payload,
      });
    },
    updateStatus(inquiryId: string, status: string): Promise<AssociateInquiry> {
      return authRequest<AssociateInquiry>(`/api/inquiries/${inquiryId}/status`, {
        method: "PATCH",
        body: { status },
      });
    },
    addAction(inquiryId: string, payload: { actionType: string; remarks: string; actionDate: string }) {
      return authRequest(`/api/inquiries/${inquiryId}/actions`, {
        method: "POST",
        body: payload,
      });
    },
    deleteAction(inquiryId: string, actionId: string) {
      return authRequest(`/api/inquiries/${inquiryId}/actions/${actionId}`, {
        method: "DELETE",
      });
    },
  };
}

export async function getLocationOptions(): Promise<LocationOption[]> {
  return request<LocationOption[]>("/api/locations");
}
