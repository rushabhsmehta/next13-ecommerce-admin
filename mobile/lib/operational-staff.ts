import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface OperationalStaffOption {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

/** Active operational staff for pickers (org members only; API returns 403 otherwise). */
export async function fetchActiveOperationalStaff(
  request: AuthenticatedRequest
): Promise<OperationalStaffOption[]> {
  const rows = await request<unknown[]>(
    "/api/operational-staff?activeOnly=true"
  );
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => {
      const row = r as {
        id?: string;
        name?: string;
        email?: string;
        isActive?: boolean;
      };
      return {
        id: row.id ?? "",
        name: row.name ?? "",
        email: typeof row.email === "string" ? row.email : "",
        isActive: row.isActive !== false,
      };
    })
    .filter((r) => r.id.length > 0);
}
