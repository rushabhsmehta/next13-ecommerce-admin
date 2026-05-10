import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface InquiryLookupOption {
  id: string;
  label: string;
}

export interface InquiryFormLookups {
  roomTypes: InquiryLookupOption[];
  occupancyTypes: InquiryLookupOption[];
  mealPlans: InquiryLookupOption[];
  vehicleTypes: InquiryLookupOption[];
}

function mapNamed(rows: unknown[]): InquiryLookupOption[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is { id: string; name: string } => {
      const x = r as { id?: unknown; name?: unknown };
      return typeof x?.id === "string" && typeof x?.name === "string";
    })
    .map((r) => ({ id: r.id, label: r.name }));
}

export async function fetchInquiryFormLookups(authRequest: AuthenticatedRequest): Promise<InquiryFormLookups> {
  const [roomTypes, occupancyTypes, mealPlans, vehicleTypes] = await Promise.all([
    authRequest<unknown[]>("/api/room-types"),
    authRequest<unknown[]>("/api/occupancy-types"),
    authRequest<unknown[]>("/api/meal-plans"),
    authRequest<unknown[]>("/api/vehicle-types"),
  ]);
  return {
    roomTypes: mapNamed(roomTypes),
    occupancyTypes: mapNamed(occupancyTypes),
    mealPlans: mapNamed(mealPlans),
    vehicleTypes: mapNamed(vehicleTypes),
  };
}

export function lookupLabel(options: InquiryLookupOption[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}
