import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";

// ── Schemas ──────────────────────────────────────────────────────────────────

const ListCustomersSchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const GetCustomerSchema = z.object({
  customerId: z.string().min(1),
});

const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  email: z.string().optional(),
  birthdate: isoDateString.optional(),
  marriageAnniversary: isoDateString.optional(),
});

const GetCustomerOutstandingSchema = z.object({
  customerId: z.string().min(1),
});

const ListCustomerSalesSchema = z.object({
  customerId: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function listCustomers(rawParams: unknown) {
  const { name, contact, limit } = ListCustomersSchema.parse(rawParams);
  return prismadb.customer.findMany({
    where: {
      ...(name && { name: { contains: name } }),
      ...(contact && { contact: { contains: contact } }),
    },
    select: { id: true, name: true, contact: true, email: true, createdAt: true },
    orderBy: { name: "asc" },
    take: limit,
  });
}

async function getCustomer(rawParams: unknown) {
  const { customerId } = GetCustomerSchema.parse(rawParams);
  const c = await prismadb.customer.findUnique({
    where: { id: customerId },
    include: {
      associatePartner: { select: { id: true, name: true } },
      _count: { select: { saleDetails: true, receiptDetails: true } },
    },
  });
  if (!c) throw new NotFoundError(`Customer ${customerId} not found`);
  return c;
}

async function createCustomer(rawParams: unknown) {
  const params = CreateCustomerSchema.parse(rawParams);
  const data: Record<string, unknown> = {
    name: params.name,
    contact: params.contact ?? null,
    email: params.email ?? null,
  };
  if (params.birthdate) {
    const d = dateToUtc(params.birthdate);
    if (d) data.birthdate = d;
  }
  if (params.marriageAnniversary) {
    const d = dateToUtc(params.marriageAnniversary);
    if (d) data.marriageAnniversary = d;
  }
  return prismadb.customer.create({ data: data as any });
}

async function getCustomerOutstanding(rawParams: unknown) {
  const { customerId } = GetCustomerOutstandingSchema.parse(rawParams);
  const c = await prismadb.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } });
  if (!c) throw new NotFoundError(`Customer ${customerId} not found`);

  const sales = await prismadb.saleDetail.findMany({
    where: { customerId },
    include: { receiptAllocations: { select: { allocatedAmount: true } } },
  });

  const items = sales.map((s) => {
    const invoiced = s.salePrice + (s.gstAmount ?? 0);
    const received = s.receiptAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    return { saleId: s.id, invoiceNumber: s.invoiceNumber, invoiced, received, balance: invoiced - received };
  });

  const totalInvoiced = items.reduce((s, i) => s + i.invoiced, 0);
  const totalReceived = items.reduce((s, i) => s + i.received, 0);

  return {
    customerId: c.id,
    customerName: c.name,
    totalInvoiced,
    totalReceived,
    totalOutstanding: totalInvoiced - totalReceived,
    sales: items,
  };
}

async function listCustomerSales(rawParams: unknown) {
  const { customerId, limit } = ListCustomerSalesSchema.parse(rawParams);
  return prismadb.saleDetail.findMany({
    where: { customerId },
    select: {
      id: true, saleDate: true, salePrice: true, gstAmount: true, invoiceNumber: true, status: true, description: true,
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      receiptAllocations: { select: { allocatedAmount: true } },
    },
    orderBy: { saleDate: "desc" },
    take: limit,
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export const customerHandlers: ToolHandlerMap = {
  list_customers: listCustomers,
  get_customer: getCustomer,
  create_customer: createCustomer,
  get_customer_outstanding: getCustomerOutstanding,
  list_customer_sales: listCustomerSales,
};
