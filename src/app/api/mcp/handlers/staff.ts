import prismadb from "@/lib/prismadb";
import { z } from "zod";
import type { ToolHandlerMap } from "../lib/schemas";

// ── Schemas ──────────────────────────────────────────────────────────────────

const ListOperationalStaffSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
  role: z.string().optional(),
});

const ListAssociatePartnersSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
  name: z.string().optional(),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function listOperationalStaff(rawParams: unknown) {
  const { includeInactive, role } = ListOperationalStaffSchema.parse(rawParams);
  return prismadb.operationalStaff.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(role && { role: role as any }),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });
}

async function listAssociatePartners(rawParams: unknown) {
  const { includeInactive, name } = ListAssociatePartnersSchema.parse(rawParams);
  return prismadb.associatePartner.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(name && { name: { contains: name } }),
    },
    select: { id: true, name: true, mobileNumber: true, email: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export const staffHandlers: ToolHandlerMap = {
  list_operational_staff: listOperationalStaff,
  list_associate_partners: listAssociatePartners,
};
