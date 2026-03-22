import { z } from "zod";
import { defineToolContract, type ToolContract } from "./core";

export const SHARED_TOOL_CONTRACT_OVERRIDES = {
  list_customers: defineToolContract({
    name: "list_customers",
    description: "Search customers by name or contact number.",
    access: "read",
    retryable: true,
    inputSchema: {
      name: z.string().optional().describe("Search by customer name (partial match)"),
      contactNumber: z
        .string()
        .optional()
        .describe("Search by customer contact number"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    normalize: (params) => ({
      name: params.name,
      contact: params.contact ?? params.contactNumber,
      limit: params.limit,
    }),
  }),
  create_customer: defineToolContract({
    name: "create_customer",
    description: "Create a new customer record.",
    access: "write",
    retryable: false,
    inputSchema: {
      name: z.string().describe("Customer full name"),
      contactNumber: z.string().optional().describe("Contact phone number"),
      email: z.string().optional().describe("Email address"),
      birthdate: z.string().optional().describe("Birth date (YYYY-MM-DD)"),
      marriageAnniversary: z
        .string()
        .optional()
        .describe("Marriage anniversary (YYYY-MM-DD)"),
    },
    normalize: (params) => ({
      name: params.name,
      contact: params.contact ?? params.contactNumber,
      email: params.email,
      birthdate: params.birthdate,
      marriageAnniversary: params.marriageAnniversary,
    }),
  }),
  unassign_inquiry_staff: defineToolContract({
    name: "unassign_inquiry_staff",
    description: "Remove staff assignment from an inquiry.",
    access: "write",
    retryable: false,
    inputSchema: {
      inquiryId: z.string().describe("The inquiry ID"),
    },
  }),
  set_inquiry_follow_up: defineToolContract({
    name: "set_inquiry_follow_up",
    description: "Set the next follow-up date for an inquiry.",
    access: "write",
    retryable: false,
    inputSchema: {
      inquiryId: z.string().describe("The inquiry ID"),
      followUpDate: z.string().describe("Next follow-up date (YYYY-MM-DD)"),
    },
  }),
  list_follow_ups_due: defineToolContract({
    name: "list_follow_ups_due",
    description:
      "List inquiries with follow-ups due today or overdue. Great for daily follow-up reviews.",
    access: "read",
    retryable: true,
    inputSchema: {
      asOfDate: z
        .string()
        .optional()
        .describe("Check follow-ups due on this date (YYYY-MM-DD, defaults to today)"),
    },
    normalize: (params) => ({
      asOfDate: params.asOfDate ?? params.date,
    }),
  }),
  update_inquiry: defineToolContract({
    name: "update_inquiry",
    description:
      "Update inquiry details (customer info, traveler counts, destination, dates, remarks).",
    access: "write",
    retryable: false,
    inputSchema: {
      inquiryId: z.string().describe("The inquiry ID to update"),
      customerName: z.string().optional().describe("Updated customer name"),
      customerMobileNumber: z.string().optional().describe("Updated mobile number"),
      locationId: z.string().optional().describe("Updated location ID"),
      locationName: z.string().optional().describe("Updated location name"),
      numAdults: z.number().int().min(1).optional().describe("Updated number of adults"),
      numChildrenAbove11: z.number().int().min(0).optional().describe("Updated children above 11"),
      numChildren5to11: z.number().int().min(0).optional().describe("Updated children 5-11"),
      numChildrenBelow5: z.number().int().min(0).optional().describe("Updated children below 5"),
      journeyDate: z.string().optional().describe("Updated travel date (YYYY-MM-DD)"),
      remarks: z.string().optional().describe("Updated remarks"),
    },
  }),
} satisfies Record<string, ToolContract>;

export function getSharedToolContractOverride(toolName: string): ToolContract | null {
  return SHARED_TOOL_CONTRACT_OVERRIDES[toolName as keyof typeof SHARED_TOOL_CONTRACT_OVERRIDES] ?? null;
}