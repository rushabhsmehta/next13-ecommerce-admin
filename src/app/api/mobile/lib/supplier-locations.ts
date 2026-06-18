import type { Prisma } from "@prisma/client";

export function supplierLocationCreateInput(
  locationIds: string[] | undefined
): Pick<Prisma.SupplierCreateInput, "locations"> {
  if (!locationIds?.length) return {};
  return {
    locations: {
      create: locationIds.map((locationId) => ({
        location: { connect: { id: locationId } },
      })),
    },
  };
}

export const supplierLocationsSelect = {
  locations: {
    select: {
      location: {
        select: { id: true, label: true },
      },
    },
  },
} as const;

export function mapSupplierLocations(
  links: { location: { id: string; label: string } }[]
): { id: string; label: string }[] {
  return links.map((link) => ({
    id: link.location.id,
    label: link.location.label,
  }));
}
