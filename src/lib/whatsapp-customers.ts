import { Prisma, WhatsAppCustomer } from '@prisma/whatsapp-client';
import whatsappPrisma from './whatsapp-prismadb';
import { normalizePhoneNumberOrThrow } from './phone-utils';

export type WhatsAppCustomerInput = {
  firstName: string;
  lastName?: string | null;
  phoneNumber: string;
  email?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  isOptedIn?: boolean;
  metadata?: Record<string, unknown> | null;
  importedFrom?: string | null;
  importedAt?: Date | null;
  lastContactedAt?: Date | null;
  associatePartnerId?: string | null;
};

export type WhatsAppCustomerFilters = {
  search?: string;
  tags?: string[];
  isOptedIn?: boolean;
  skip?: number;
  take?: number;
  orderBy?: Prisma.WhatsAppCustomerOrderByWithRelationInput | Prisma.WhatsAppCustomerOrderByWithRelationInput[];
};

const DEFAULT_PAGE_SIZE = 50;

function extractDigits(value: string) {
  return value.replace(/[^0-9]/g, '');
}

export function normalizeWhatsAppPhone(phone: string) {
  if (!phone || !phone.trim()) {
    throw new Error('Phone number is required');
  }
  const normalized = normalizePhoneNumberOrThrow(phone);
  return normalized.e164;
}

function sanitizeTags(tags?: string[] | null) {
  if (!tags) {
    return undefined;
  }
  const cleaned = Array.from(
    new Set(
      tags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => tag.length > 0)
    )
  );
  return cleaned.length ? cleaned : undefined;
}

function buildCreateData(input: WhatsAppCustomerInput): Prisma.WhatsAppCustomerCreateInput {
  const normalizedPhone = normalizeWhatsAppPhone(input.phoneNumber);
  const tags = sanitizeTags(input.tags ?? null);

  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName?.trim() || null,
    phoneNumber: normalizedPhone,
    email: input.email?.trim() || null,
    tags: tags || undefined, // PostgreSQL uses String[] for tags
    notes: input.notes?.trim() || null,
    isOptedIn: input.isOptedIn ?? true,
    metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
    importedFrom: input.importedFrom || undefined,
    importedAt: input.importedAt || undefined,
    lastContactedAt: input.lastContactedAt || undefined,
    associatePartnerId: input.associatePartnerId || null,
  };
}

function buildUpdateData(input: Partial<WhatsAppCustomerInput>): Prisma.WhatsAppCustomerUpdateInput {
  const data: Prisma.WhatsAppCustomerUpdateInput = {};

  if (input.firstName !== undefined) {
    data.firstName = input.firstName.trim();
  }
  if (input.lastName !== undefined) {
    data.lastName = input.lastName?.trim() || null;
  }
  if (input.phoneNumber !== undefined) {
    data.phoneNumber = normalizeWhatsAppPhone(input.phoneNumber);
  }
  if (input.email !== undefined) {
    data.email = input.email?.trim() || null;
  }
  if (input.tags !== undefined) {
    const tags = sanitizeTags(input.tags);
    data.tags = tags || []; // PostgreSQL uses String[] for tags, empty array instead of null
  }
  if (input.notes !== undefined) {
    data.notes = input.notes?.trim() || null;
  }
  if (input.isOptedIn !== undefined) {
    data.isOptedIn = input.isOptedIn;
  }
  if (input.metadata !== undefined) {
    data.metadata = input.metadata
      ? (input.metadata as Prisma.InputJsonValue)
      : Prisma.DbNull;
  }
  if (input.importedFrom !== undefined) {
    data.importedFrom = input.importedFrom || null;
  }
  if (input.importedAt !== undefined) {
    data.importedAt = input.importedAt || null;
  }
  if (input.lastContactedAt !== undefined) {
    data.lastContactedAt = input.lastContactedAt || null;
  }
  if (input.associatePartnerId !== undefined) {
    data.associatePartnerId = input.associatePartnerId || null;
  }

  return data;
}

function buildWhatsAppCustomerWhere(filters: Pick<WhatsAppCustomerFilters, 'search' | 'tags' | 'isOptedIn'>) {
  const { search, tags, isOptedIn } = filters;
  const where: Prisma.WhatsAppCustomerWhereInput = {};

  if (typeof isOptedIn === 'boolean') {
    where.isOptedIn = isOptedIn;
  }

  if (search) {
    const term = search.trim();
    const digits = extractDigits(term);
    where.OR = [
      { firstName: { contains: term } },
      { lastName: { contains: term } },
      { email: { contains: term } },
    ];
    if (digits.length >= 4) {
      where.OR?.push({ phoneNumber: { contains: digits } });
    }
  }

  if (tags && tags.length > 0) {
    // PostgreSQL array contains - check if any of the provided tags exists in the customer's tags array
    where.tags = { hasSome: tags };
  }

  return where;
}

export async function listWhatsAppCustomers(filters: WhatsAppCustomerFilters = {}) {
  const {
    search,
    tags,
    isOptedIn,
    skip = 0,
    take = DEFAULT_PAGE_SIZE,
    orderBy = { createdAt: 'desc' },
  } = filters;

  const where = buildWhatsAppCustomerWhere({ search, tags, isOptedIn });

  const [data, total] = await Promise.all([
    whatsappPrisma.whatsAppCustomer.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    whatsappPrisma.whatsAppCustomer.count({ where }),
  ]);

  const uniqueTags = await whatsappPrisma.whatsAppCustomer.findMany({
    where: { tags: { isEmpty: false } }, // PostgreSQL array: get customers with non-empty tags
    select: { tags: true },
  });

  const tagSet = new Map<string, number>();
  uniqueTags.forEach((entry) => {
    const tagArray = Array.isArray(entry.tags) ? (entry.tags as string[]) : [];
    tagArray.forEach((tag) => {
      if (typeof tag === 'string') {
        const key = tag.trim();
        if (!key) {
          return;
        }
        tagSet.set(key, (tagSet.get(key) || 0) + 1);
      }
    });
  });

  return {
    data,
    total,
    tags: Array.from(tagSet.entries()).map(([tag, count]) => ({ tag, count })),
  };
}

export async function exportWhatsAppCustomers(filters: WhatsAppCustomerFilters = {}) {
  const { search, tags, isOptedIn } = filters;
  const where = buildWhatsAppCustomerWhere({ search, tags, isOptedIn });
  const orderBy = filters.orderBy ?? [{ firstName: 'asc' }, { lastName: 'asc' }];
  return whatsappPrisma.whatsAppCustomer.findMany({ where, orderBy });
}

export async function getWhatsAppCustomerById(id: string) {
  return whatsappPrisma.whatsAppCustomer.findUnique({ where: { id } });
}

export async function createWhatsAppCustomer(input: WhatsAppCustomerInput) {
  const data = buildCreateData(input);
  return whatsappPrisma.whatsAppCustomer.create({ data });
}

export async function updateWhatsAppCustomer(id: string, input: Partial<WhatsAppCustomerInput>) {
  const data = buildUpdateData(input);
  return whatsappPrisma.whatsAppCustomer.update({ where: { id }, data });
}

export async function deleteWhatsAppCustomer(id: string) {
  return whatsappPrisma.whatsAppCustomer.delete({ where: { id } });
}

export async function upsertWhatsAppCustomers(
  customers: WhatsAppCustomerInput[],
  options: { importedFrom?: string } = {}
) {
  if (!customers.length) {
    return { created: 0, updated: 0 };
  }

  let created = 0;
  let updated = 0;

  const results = await prisma.$transaction(
    customers.map((customer) => {
      const normalizedPhone = normalizeWhatsAppPhone(customer.phoneNumber);
      const createData = buildCreateData({
        ...customer,
        phoneNumber: normalizedPhone,
        importedFrom: customer.importedFrom ?? options.importedFrom ?? undefined,
        importedAt: customer.importedAt ?? new Date(),
      });
      const updateData = buildUpdateData({
        ...customer,
        phoneNumber: normalizedPhone,
        importedFrom: customer.importedFrom ?? options.importedFrom ?? undefined,
        importedAt: customer.importedAt ?? new Date(),
      });

      return whatsappPrisma.whatsAppCustomer.upsert({
        where: { phoneNumber: normalizedPhone },
        update: {
          ...updateData,
          importedFrom: options.importedFrom ?? updateData.importedFrom ?? undefined,
          importedAt: customer.importedAt ?? new Date(),
        },
        create: createData,
      });
    })
  );

  results.forEach((result: WhatsAppCustomer | undefined) => {
    if (result?.createdAt && result.createdAt.getTime() === result.updatedAt.getTime()) {
      created += 1;
    } else {
      updated += 1;
    }
  });

  return { created, updated };
}

export async function getWhatsAppCustomerTags() {
  const rows = await whatsappPrisma.whatsAppCustomer.findMany({
    where: { tags: { isEmpty: false } }, // PostgreSQL array
    select: { tags: true },
  });

  const tagSet = new Map<string, number>();
  rows.forEach((row) => {
    const tagArray = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    tagArray.forEach((tag) => {
      if (typeof tag === 'string') {
        const key = tag.trim();
        if (!key) {
          return;
        }
        tagSet.set(key, (tagSet.get(key) || 0) + 1);
      }
    });
  });

  return Array.from(tagSet.entries()).map(([tag, count]) => ({ tag, count }));
}

export async function ensureWhatsAppCustomersExist(ids: string[]): Promise<WhatsAppCustomer[]> {
  if (!ids.length) {
    return [];
  }
  return whatsappPrisma.whatsAppCustomer.findMany({ where: { id: { in: ids } } });
}



