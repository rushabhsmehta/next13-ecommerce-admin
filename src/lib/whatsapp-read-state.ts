import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { buildWhatsAppAddressVariants } from "@/lib/whatsapp";

/** Normalize to +E.164 for consistent read-cursor storage. */
export function normalizeStaffReadPhone(phone: string): string {
  const cleaned = phone.trim().replace(/^whatsapp:/i, "");
  if (!cleaned || /^business$/i.test(cleaned)) {
    throw new Error("Invalid phone number");
  }
  const variants = buildWhatsAppAddressVariants(cleaned);
  const withPlus = variants.find((v) => v.startsWith("+") && !v.startsWith("whatsapp:"));
  if (!withPlus) {
    throw new Error("Invalid phone number");
  }
  return withPlus;
}

/** Compare phones ignoring optional leading +. */
export function phonesMatchForRead(a: string, b: string): boolean {
  const strip = (p: string) => p.replace(/^whatsapp:/i, "").replace(/^\+/, "").replace(/[^\d]/g, "");
  return strip(a) === strip(b) && strip(a).length > 0;
}

export function countUnreadInbound(
  inboundCreatedAts: Date[],
  lastReadAt: Date | null,
): number {
  if (!lastReadAt) {
    return inboundCreatedAts.length;
  }
  const lastMs = lastReadAt.getTime();
  return inboundCreatedAts.reduce(
    (count, createdAt) => (createdAt.getTime() > lastMs ? count + 1 : count),
    0,
  );
}

export async function markWhatsAppConversationRead(
  userId: string,
  phone: string,
  lastReadAt: Date = new Date(),
): Promise<{ phone: string; lastReadAt: string }> {
  const normalized = normalizeStaffReadPhone(phone);

  await whatsappPrisma.whatsAppStaffReadState.upsert({
    where: {
      userId_phone: { userId, phone: normalized },
    },
    create: {
      userId,
      phone: normalized,
      lastReadAt,
    },
    update: {
      lastReadAt,
    },
  });

  return { phone: normalized, lastReadAt: lastReadAt.toISOString() };
}

export async function getWhatsAppReadStates(
  userId: string,
  phones?: string[],
): Promise<Record<string, string>> {
  const rows = await whatsappPrisma.whatsAppStaffReadState.findMany({
    where: {
      userId,
      ...(phones?.length
        ? {
            OR: phones.flatMap((p) => {
              try {
                const normalized = normalizeStaffReadPhone(p);
                const digits = normalized.replace(/^\+/, "");
                return [
                  { phone: normalized },
                  { phone: digits },
                  { phone: `+${digits}` },
                ];
              } catch {
                return [];
              }
            }),
          }
        : {}),
    },
    select: { phone: true, lastReadAt: true },
  });

  const out: Record<string, string> = {};
  for (const row of rows) {
    out[row.phone] = row.lastReadAt.toISOString();
    const digits = row.phone.replace(/^\+/, "");
    out[`+${digits}`] = row.lastReadAt.toISOString();
    out[digits] = row.lastReadAt.toISOString();
  }
  return out;
}
