import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";
import { INQUIRY_STATUSES } from "@/lib/inquiry-statuses";

// ── Schemas ──────────────────────────────────────────────────────────────────

const ALLOWED_INQUIRY_STATUSES = INQUIRY_STATUSES;

const CreateInquirySchema = z.object({
  customerName: z.string().min(1),
  customerMobileNumber: z.string().min(1),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
  numAdults: z.number().int().min(1),
  numChildrenAbove11: z.number().int().min(0).optional().default(0),
  numChildren5to11: z.number().int().min(0).optional().default(0),
  numChildrenBelow5: z.number().int().min(0).optional().default(0),
  journeyDate: isoDateString,
  remarks: z.string().optional(),
  status: z.enum(ALLOWED_INQUIRY_STATUSES).optional().default("PENDING"),
}).refine((d: { locationId?: string; locationName?: string }) => !!(d.locationId || d.locationName), {
  message: "locationId or locationName is required",
  path: ["locationId"],
});

const ListInquiriesSchema = z.object({
  status: z.string().optional(),
  customerName: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional().default(25),
});

const GetInquirySchema = z.object({ inquiryId: z.string().min(1) });

const UpdateInquiryStatusSchema = z.object({
  inquiryId: z.string().min(1),
  status: z.enum(ALLOWED_INQUIRY_STATUSES),
  remarks: z.string().optional(),
});

const AddInquiryNoteSchema = z.object({
  inquiryId: z.string().min(1),
  note: z.string().min(1),
  actionType: z.string().optional(),
});

const AssignInquiryStaffSchema = z.object({
  inquiryId: z.string().min(1),
  staffId: z.string().min(1),
});

const UnassignInquiryStaffSchema = z.object({
  inquiryId: z.string().min(1),
});

const SetInquiryFollowUpSchema = z.object({
  inquiryId: z.string().min(1),
  followUpDate: isoDateString,
});

const GetInquiryActionsSchema = z.object({
  inquiryId: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const UpdateInquirySchema = z.object({
  inquiryId: z.string().min(1),
  customerName: z.string().optional(),
  customerMobileNumber: z.string().optional(),
  numAdults: z.number().int().min(1).optional(),
  numChildrenAbove11: z.number().int().min(0).optional(),
  numChildren5to11: z.number().int().min(0).optional(),
  numChildrenBelow5: z.number().int().min(0).optional(),
  journeyDate: isoDateString.optional(),
  remarks: z.string().optional(),
});

const DeleteInquirySchema = z.object({
  inquiryId: z.string().min(1),
});

const ListFollowUpsDueSchema = z.object({
  asOfDate: isoDateString.optional(),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function createInquiry(rawParams: unknown) {
  const params = CreateInquirySchema.parse(rawParams);
  let locationId = params.locationId;

  // Resolve location by name if ID not provided
  if (!locationId && params.locationName) {
    const loc = await prismadb.location.findFirst({
      where: {
        isActive: true,
        label: { contains: params.locationName },
      },
    });
    if (!loc) throw new NotFoundError(
      `Location "${params.locationName}" not found. Call search_locations first to find the correct name.`,
      "LOCATION_NOT_FOUND"
    );
    locationId = loc.id;
  }

  // locationId is guaranteed by the Zod refine — narrowing for TypeScript
  const resolvedLocationId = locationId!;

  const journeyDate = dateToUtc(params.journeyDate);
  // dateToUtc returns undefined only when input is falsy; Zod already ensured journeyDate is a valid date string
  if (!journeyDate) throw new Error("Invalid journeyDate");

  const inquiry = await prismadb.inquiry.create({
    data: {
      customerName: params.customerName,
      customerMobileNumber: params.customerMobileNumber,
      locationId: resolvedLocationId,
      numAdults: params.numAdults,
      numChildrenAbove11: params.numChildrenAbove11 ?? 0,
      numChildren5to11: params.numChildren5to11 ?? 0,
      numChildrenBelow5: params.numChildrenBelow5 ?? 0,
      journeyDate,
      remarks: params.remarks ?? null,
      status: params.status ?? "PENDING",
    },
    include: {
      location: { select: { id: true, label: true } },
    },
  });

  return inquiry;
}

async function listInquiries(rawParams: unknown) {
  const params = ListInquiriesSchema.parse(rawParams);
  const { status, limit, customerName } = params;
  return prismadb.inquiry.findMany({
    where: {
      ...(status && status !== "ALL" && { status }),
      ...(customerName && { customerName: { contains: customerName } }),
    },
    select: {
      id: true,
      customerName: true,
      customerMobileNumber: true,
      status: true,
      journeyDate: true,
      numAdults: true,
      numChildrenAbove11: true,
      numChildren5to11: true,
      numChildrenBelow5: true,
      remarks: true,
      nextFollowUpDate: true,
      createdAt: true,
      location: { select: { id: true, label: true } },
      associatePartner: { select: { id: true, name: true } },
      tourPackageQueries: { select: { id: true, tourPackageQueryName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getInquiry(rawParams: unknown) {
  const params = GetInquirySchema.parse(rawParams);
  const inquiry = await prismadb.inquiry.findUnique({
    where: { id: params.inquiryId },
    include: {
      location: true,
      associatePartner: true,
      actions: { orderBy: { createdAt: "desc" } },
      tourPackageQueries: {
        select: {
          id: true,
          tourPackageQueryNumber: true,
          tourPackageQueryName: true,
          totalPrice: true,
          confirmedVariantId: true,
        },
      },
      roomAllocations: {
        include: { roomType: true, occupancyType: true, mealPlan: true },
      },
    },
  });
  if (!inquiry) throw new NotFoundError(`Inquiry ${params.inquiryId} not found`, "INQUIRY_NOT_FOUND");
  return inquiry;
}

async function updateInquiryStatus(rawParams: unknown) {
  const params = UpdateInquiryStatusSchema.parse(rawParams);
  const existing = await prismadb.inquiry.findUnique({
    where: { id: params.inquiryId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError(`Inquiry ${params.inquiryId} not found`, "INQUIRY_NOT_FOUND");

  return prismadb.inquiry.update({
    where: { id: params.inquiryId },
    data: {
      status: params.status,
      ...(params.remarks !== undefined && { remarks: params.remarks }),
    },
    select: {
      id: true,
      customerName: true,
      status: true,
      updatedAt: true,
    },
  });
}

async function addInquiryNote(rawParams: unknown) {
  const params = AddInquiryNoteSchema.parse(rawParams);
  // Verify inquiry exists
  const inquiry = await prismadb.inquiry.findUnique({
    where: { id: params.inquiryId },
    select: { id: true },
  });
  if (!inquiry) throw new NotFoundError(`Inquiry ${params.inquiryId} not found`, "INQUIRY_NOT_FOUND");

  return prismadb.inquiryAction.create({
    data: {
      inquiryId: params.inquiryId,
      actionType: params.actionType ?? "NOTE",
      remarks: params.note,
      actionDate: new Date(),
    },
  });
}

async function assignInquiryStaff(rawParams: unknown) {
  const { inquiryId, staffId } = AssignInquiryStaffSchema.parse(rawParams);
  const inquiry = await prismadb.inquiry.findUnique({ where: { id: inquiryId }, select: { id: true } });
  if (!inquiry) throw new NotFoundError(`Inquiry ${inquiryId} not found`);
  const staff = await prismadb.operationalStaff.findUnique({ where: { id: staffId }, select: { id: true, name: true } });
  if (!staff) throw new NotFoundError(`Staff ${staffId} not found`);
  return prismadb.inquiry.update({
    where: { id: inquiryId },
    data: { assignedToStaffId: staffId, assignedStaffAt: new Date() },
    select: { id: true, customerName: true, assignedToStaffId: true },
  });
}

async function unassignInquiryStaff(rawParams: unknown) {
  const { inquiryId } = UnassignInquiryStaffSchema.parse(rawParams);
  const inquiry = await prismadb.inquiry.findUnique({ where: { id: inquiryId }, select: { id: true } });
  if (!inquiry) throw new NotFoundError(`Inquiry ${inquiryId} not found`);
  return prismadb.inquiry.update({
    where: { id: inquiryId },
    data: { assignedToStaffId: null, assignedStaffAt: null },
    select: { id: true, customerName: true, assignedToStaffId: true },
  });
}

async function setInquiryFollowUp(rawParams: unknown) {
  const { inquiryId, followUpDate } = SetInquiryFollowUpSchema.parse(rawParams);
  const inquiry = await prismadb.inquiry.findUnique({ where: { id: inquiryId }, select: { id: true } });
  if (!inquiry) throw new NotFoundError(`Inquiry ${inquiryId} not found`);
  const d = dateToUtc(followUpDate);
  if (!d) throw new McpError("Invalid followUpDate", "VALIDATION_ERROR", 422);
  return prismadb.inquiry.update({
    where: { id: inquiryId },
    data: { nextFollowUpDate: d },
    select: { id: true, customerName: true, nextFollowUpDate: true },
  });
}

async function getInquiryActions(rawParams: unknown) {
  const { inquiryId, limit } = GetInquiryActionsSchema.parse(rawParams);
  return prismadb.inquiryAction.findMany({
    where: { inquiryId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function updateInquiry(rawParams: unknown) {
  const { inquiryId, journeyDate, ...rest } = UpdateInquirySchema.parse(rawParams);
  const existing = await prismadb.inquiry.findUnique({ where: { id: inquiryId }, select: { id: true } });
  if (!existing) throw new NotFoundError(`Inquiry ${inquiryId} not found`);

  const data: Record<string, unknown> = { ...rest };
  if (journeyDate) {
    const d = dateToUtc(journeyDate);
    if (d) data.journeyDate = d;
  }
  return prismadb.inquiry.update({
    where: { id: inquiryId },
    data,
    select: { id: true, customerName: true, customerMobileNumber: true, status: true, journeyDate: true, updatedAt: true },
  });
}

async function deleteInquiry(rawParams: unknown) {
  const { inquiryId } = DeleteInquirySchema.parse(rawParams);
  const inquiry = await prismadb.inquiry.findUnique({
    where: { id: inquiryId },
    include: { tourPackageQueries: { select: { id: true } } },
  });
  if (!inquiry) throw new NotFoundError(`Inquiry ${inquiryId} not found`);
  if (inquiry.tourPackageQueries.length > 0) {
    throw new McpError(
      `Cannot delete inquiry ${inquiryId} — it has ${inquiry.tourPackageQueries.length} linked tour queries`,
      "HAS_DEPENDENCIES", 409
    );
  }
  await prismadb.inquiryAction.deleteMany({ where: { inquiryId } });
  await prismadb.inquiry.delete({ where: { id: inquiryId } });
  return { message: "Inquiry deleted successfully", inquiryId };
}

async function listFollowUpsDue(rawParams: unknown) {
  const { asOfDate } = ListFollowUpsDueSchema.parse(rawParams);
  const cutoff = asOfDate ? dateToUtc(asOfDate) : new Date();
  if (cutoff) cutoff.setUTCHours(23, 59, 59, 999);
  return prismadb.inquiry.findMany({
    where: {
      nextFollowUpDate: { lte: cutoff ?? new Date() },
      status: { notIn: ["CONFIRMED", "CANCELLED"] },
    },
    select: {
      id: true, customerName: true, customerMobileNumber: true, status: true,
      nextFollowUpDate: true, journeyDate: true, remarks: true,
      location: { select: { id: true, label: true } },
      assignedStaff: { select: { id: true, name: true } },
    },
    orderBy: { nextFollowUpDate: "asc" },
  });
}

async function getInquirySummary(_rawParams: unknown) {
  const [total, pending, confirmed, cancelled, hotQuery, querySent] = await Promise.all([
    prismadb.inquiry.count(),
    prismadb.inquiry.count({ where: { status: "PENDING" } }),
    prismadb.inquiry.count({ where: { status: "CONFIRMED" } }),
    prismadb.inquiry.count({ where: { status: "CANCELLED" } }),
    prismadb.inquiry.count({ where: { status: "HOT_QUERY" } }),
    prismadb.inquiry.count({ where: { status: "QUERY_SENT" } }),
  ]);
  return { total, pending, confirmed, cancelled, hotQuery, querySent };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const inquiryHandlers: ToolHandlerMap = {
  create_inquiry: createInquiry,
  list_inquiries: listInquiries,
  get_inquiry: getInquiry,
  update_inquiry_status: updateInquiryStatus,
  add_inquiry_note: addInquiryNote,
  assign_inquiry_staff: assignInquiryStaff,
  unassign_inquiry_staff: unassignInquiryStaff,
  set_inquiry_follow_up: setInquiryFollowUp,
  get_inquiry_actions: getInquiryActions,
  update_inquiry: updateInquiry,
  delete_inquiry: deleteInquiry,
  list_follow_ups_due: listFollowUpsDue,
  get_inquiry_summary: getInquirySummary,
};
