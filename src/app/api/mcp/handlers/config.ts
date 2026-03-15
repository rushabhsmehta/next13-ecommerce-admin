import prismadb from "@/lib/prismadb";
import { z } from "zod";
import type { ToolHandlerMap } from "../lib/schemas";

// ── Schemas ──────────────────────────────────────────────────────────────────

const ListRoomTypesSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

const ListMealPlansSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

const ListVehicleTypesSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

const ListOccupancyTypesSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function listRoomTypes(rawParams: unknown) {
  const { includeInactive } = ListRoomTypesSchema.parse(rawParams);
  return prismadb.roomType.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: { id: true, name: true, description: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

async function listMealPlans(rawParams: unknown) {
  const { includeInactive } = ListMealPlansSchema.parse(rawParams);
  return prismadb.mealPlan.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: { id: true, name: true, code: true, description: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

async function listVehicleTypes(rawParams: unknown) {
  const { includeInactive } = ListVehicleTypesSchema.parse(rawParams);
  return prismadb.vehicleType.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: { id: true, name: true, description: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

async function listOccupancyTypes(rawParams: unknown) {
  const { includeInactive } = ListOccupancyTypesSchema.parse(rawParams);
  return prismadb.occupancyType.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: { id: true, name: true, description: true, maxPersons: true, rank: true, isActive: true },
    orderBy: { rank: "asc" },
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export const configHandlers: ToolHandlerMap = {
  list_room_types: listRoomTypes,
  list_meal_plans: listMealPlans,
  list_vehicle_types: listVehicleTypes,
  list_occupancy_types: listOccupancyTypes,
};
