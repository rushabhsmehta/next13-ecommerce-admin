import prismadb from '@/lib/prismadb';

const ROLE_ORDER = ['VIEWER','OPERATIONS','FINANCE','ADMIN','OWNER'] as const;
export type AppRole = typeof ROLE_ORDER[number];

export async function getUserOrgRole(userId: string, organizationId?: string): Promise<AppRole | null> {
  if (!userId) return null;
  const membership = await (prismadb as any).organizationMember.findFirst({
    where: { userId, isActive: true, ...(organizationId ? { organizationId } : {}) },
    orderBy: { createdAt: 'asc' }
  });
  return membership?.role || null;
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
