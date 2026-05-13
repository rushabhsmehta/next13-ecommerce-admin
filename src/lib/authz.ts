/**
 * Organization RBAC is stored in MySQL `OrganizationMember` (see Prisma `OrganizationMember`).
 *
 * Important: `OrganizationMember.userId` must be the Clerk user id (`user_...` from the
 * Clerk Dashboard or `auth()` in this app), not an internal staff table id.
 */
import prismadb from '@/lib/prismadb';

const ROLE_ORDER = ['VIEWER','OPERATIONS','FINANCE','ADMIN','OWNER'] as const;
export type AppRole = typeof ROLE_ORDER[number];

/**
 * Returns the caller's active `OrganizationRole` for the org (or first org if `organizationId` omitted).
 * `userId` must be the Clerk user id; it is matched against `OrganizationMember.userId`.
 */
export async function getUserOrgRole(userId: string, organizationId?: string): Promise<AppRole | null> {
  if (!userId) return null;
  const membership = await prismadb.organizationMember.findFirst({
    where: { userId, isActive: true, ...(organizationId ? { organizationId } : {}) },
    orderBy: { createdAt: 'asc' }
  });
  return (membership?.role as AppRole) || null;
}

/** Requires ADMIN or OWNER for the given organization (or any org if `organizationId` omitted). */
export async function requireOrgAdmin(userId: string, organizationId?: string) {
  const role = await getUserOrgRole(userId, organizationId);
  if (!roleAtLeast(role, 'ADMIN')) {
    const error: Error & { code?: string } = new Error('Forbidden');
    error.code = 'FORBIDDEN';
    throw error;
  }
  return role;
}

export function roleAtLeast(role: AppRole | null | undefined, minimum: AppRole) {
  if (!role) return false;
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minimum);
}

export async function requireFinanceOrAdmin(userId: string, organizationId?: string) {
  const role = await getUserOrgRole(userId, organizationId);
  if (!role || !(role === 'FINANCE' || role === 'ADMIN' || role === 'OWNER')) {
    const error: any = new Error('Forbidden');
    error.code = 'FORBIDDEN';
    throw error;
  }
  return role;
}
