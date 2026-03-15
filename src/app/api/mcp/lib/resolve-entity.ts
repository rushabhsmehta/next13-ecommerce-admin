import prismadb from "@/lib/prismadb";
import { NotFoundError } from "./errors";

/** Resolve customer by ID or fuzzy name match */
export async function resolveCustomer(opts: {
  customerId?: string;
  customerName?: string;
}): Promise<{ id: string; name: string }> {
  if (opts.customerId) {
    const c = await prismadb.customer.findUnique({
      where: { id: opts.customerId },
      select: { id: true, name: true },
    });
    if (!c) throw new NotFoundError(`Customer "${opts.customerId}" not found`, "CUSTOMER_NOT_FOUND");
    return c;
  }
  if (opts.customerName) {
    const c = await prismadb.customer.findFirst({
      where: { name: { contains: opts.customerName } },
      select: { id: true, name: true },
    });
    if (!c) throw new NotFoundError(`Customer named "${opts.customerName}" not found`, "CUSTOMER_NOT_FOUND");
    return c;
  }
  throw new NotFoundError("No customer identifier provided", "CUSTOMER_NOT_FOUND");
}

/** Resolve supplier by ID or fuzzy name match */
export async function resolveSupplier(opts: {
  supplierId?: string;
  supplierName?: string;
}): Promise<{ id: string; name: string }> {
  if (opts.supplierId) {
    const s = await prismadb.supplier.findUnique({
      where: { id: opts.supplierId },
      select: { id: true, name: true },
    });
    if (!s) throw new NotFoundError(`Supplier "${opts.supplierId}" not found`, "SUPPLIER_NOT_FOUND");
    return s;
  }
  if (opts.supplierName) {
    const s = await prismadb.supplier.findFirst({
      where: { name: { contains: opts.supplierName } },
      select: { id: true, name: true },
    });
    if (!s) throw new NotFoundError(`Supplier named "${opts.supplierName}" not found`, "SUPPLIER_NOT_FOUND");
    return s;
  }
  throw new NotFoundError("No supplier identifier provided", "SUPPLIER_NOT_FOUND");
}

/** Resolve location by ID or fuzzy name match */
export async function resolveLocation(opts: {
  locationId?: string;
  locationName?: string;
}): Promise<{ id: string; label: string }> {
  if (opts.locationId) {
    const loc = await prismadb.location.findUnique({
      where: { id: opts.locationId },
      select: { id: true, label: true },
    });
    if (!loc) throw new NotFoundError(`Location "${opts.locationId}" not found`, "LOCATION_NOT_FOUND");
    return loc;
  }
  if (opts.locationName) {
    const loc = await prismadb.location.findFirst({
      where: { isActive: true, label: { contains: opts.locationName } },
      select: { id: true, label: true },
    });
    if (!loc) throw new NotFoundError(
      `Location "${opts.locationName}" not found. Call search_locations first to find the correct name.`,
      "LOCATION_NOT_FOUND"
    );
    return loc;
  }
  throw new NotFoundError("No location identifier provided", "LOCATION_NOT_FOUND");
}
