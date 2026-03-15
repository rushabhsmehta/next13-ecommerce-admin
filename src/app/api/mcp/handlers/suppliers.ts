import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { NotFoundError } from "../lib/errors";
import type { ToolHandlerMap } from "../lib/schemas";

// ── Schemas ──────────────────────────────────────────────────────────────────

const ListSuppliersSchema = z.object({
  name: z.string().optional(),
  locationId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const GetSupplierSchema = z.object({
  supplierId: z.string().min(1),
});

const CreateSupplierSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  email: z.string().optional(),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  panNumber: z.string().optional(),
});

const GetSupplierOutstandingSchema = z.object({
  supplierId: z.string().min(1),
});

const ListSupplierPurchasesSchema = z.object({
  supplierId: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function listSuppliers(rawParams: unknown) {
  const { name, locationId, limit } = ListSuppliersSchema.parse(rawParams);
  return prismadb.supplier.findMany({
    where: {
      ...(name && { name: { contains: name } }),
      ...(locationId && { locations: { some: { locationId } } }),
    },
    select: {
      id: true, name: true, contact: true, email: true, gstNumber: true, panNumber: true, createdAt: true,
    },
    orderBy: { name: "asc" },
    take: limit,
  });
}

async function getSupplier(rawParams: unknown) {
  const { supplierId } = GetSupplierSchema.parse(rawParams);
  const s = await prismadb.supplier.findUnique({
    where: { id: supplierId },
    include: {
      contacts: { select: { id: true, number: true, label: true, isPrimary: true } },
      locations: { include: { location: { select: { id: true, label: true } } } },
      _count: { select: { purchaseDetails: true, paymentDetails: true } },
    },
  });
  if (!s) throw new NotFoundError(`Supplier ${supplierId} not found`);
  return s;
}

async function createSupplier(rawParams: unknown) {
  const params = CreateSupplierSchema.parse(rawParams);
  return prismadb.supplier.create({
    data: {
      name: params.name,
      contact: params.contact ?? null,
      email: params.email ?? null,
      gstNumber: params.gstNumber ?? null,
      address: params.address ?? null,
      panNumber: params.panNumber ?? null,
    },
  });
}

async function getSupplierOutstanding(rawParams: unknown) {
  const { supplierId } = GetSupplierOutstandingSchema.parse(rawParams);
  const s = await prismadb.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true } });
  if (!s) throw new NotFoundError(`Supplier ${supplierId} not found`);

  const purchases = await prismadb.purchaseDetail.findMany({
    where: { supplierId },
    include: { paymentAllocations: { select: { allocatedAmount: true } } },
  });

  const items = purchases.map((p) => {
    const billed = p.netPayable ?? (p.price + (p.gstAmount ?? 0));
    const paid = p.paymentAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    return { purchaseId: p.id, billNumber: p.billNumber, billed, paid, balance: billed - paid };
  });

  const totalBilled = items.reduce((s, i) => s + i.billed, 0);
  const totalPaid = items.reduce((s, i) => s + i.paid, 0);

  return {
    supplierId: s.id,
    supplierName: s.name,
    totalBilled,
    totalPaid,
    totalOutstanding: totalBilled - totalPaid,
    purchases: items,
  };
}

async function listSupplierPurchases(rawParams: unknown) {
  const { supplierId, limit } = ListSupplierPurchasesSchema.parse(rawParams);
  return prismadb.purchaseDetail.findMany({
    where: { supplierId },
    select: {
      id: true, purchaseDate: true, price: true, gstAmount: true, netPayable: true, billNumber: true, status: true, description: true,
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      paymentAllocations: { select: { allocatedAmount: true } },
    },
    orderBy: { purchaseDate: "desc" },
    take: limit,
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export const supplierHandlers: ToolHandlerMap = {
  list_suppliers: listSuppliers,
  get_supplier: getSupplier,
  create_supplier: createSupplier,
  get_supplier_outstanding: getSupplierOutstanding,
  list_supplier_purchases: listSupplierPurchases,
};
