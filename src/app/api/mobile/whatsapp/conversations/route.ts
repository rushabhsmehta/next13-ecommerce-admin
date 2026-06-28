import { NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/whatsapp-client";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const LOOKBACK_DAYS = 90;

interface ConversationRow {
  phone: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  meta_contact_name: string | null;
  last_message: string | null;
  last_message_at: Date;
  last_direction: string;
  last_status: string | null;
  last_outbound_at: Date | null;
  unread_count: bigint;
}

interface ConversationDto {
  phone: string;
  customerName: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  lastDirection: string;
  lastStatus: string | null;
  unreadCount: number;
  lastOutboundAt: string | null;
}

function buildEtag(rows: ConversationRow[]): string {
  if (rows.length === 0) return '"empty"';
  const latestMs = rows.reduce(
    (max, r) => Math.max(max, r.last_message_at.getTime()),
    0,
  );
  const totalUnread = rows.reduce(
    (sum, r) => sum + Number(r.unread_count),
    0,
  );
  const hash = crypto
    .createHash("sha1")
    .update(`${latestMs}|${rows.length}|${totalUnread}`)
    .digest("hex")
    .slice(0, 16);
  return `"${hash}"`;
}

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const staffUserId = admin.userId;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Math.max(
        parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) ||
          DEFAULT_LIMIT,
        1,
      ),
      MAX_LIMIT,
    );
    const cursor = searchParams.get("cursor");
    const ifNoneMatch = req.headers.get("If-None-Match");

    const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Composite cursor "<isoTs>|<phone>" — using only the timestamp would
    // skip rows that share a millisecond with the previous page boundary.
    let cursorDate: Date | null = null;
    let cursorPhone: string | null = null;
    if (cursor) {
      const sep = cursor.indexOf("|");
      const tsPart = sep >= 0 ? cursor.slice(0, sep) : cursor;
      cursorPhone = sep >= 0 ? cursor.slice(sep + 1) : "";
      const parsed = new Date(tsPart);
      if (Number.isNaN(parsed.getTime())) {
        return new NextResponse("invalid cursor", { status: 400 });
      }
      cursorDate = parsed;
    }

    // Use PostgreSQL row comparison so (last_message_at, phone) is treated
    // as a lexicographic tuple — paginates deterministically when many
    // threads share a timestamp.
    const cursorClause =
      cursorDate !== null
        ? Prisma.sql`AND (l.last_message_at, l.phone) < (${cursorDate}, ${cursorPhone ?? ""})`
        : Prisma.empty;

    const rows = await whatsappPrisma.$queryRaw<ConversationRow[]>(Prisma.sql`
      WITH normalized AS (
        SELECT
          REGEXP_REPLACE(
            COALESCE(
              CASE WHEN direction = 'inbound' THEN "from" ELSE "to" END,
              ''
            ),
            '^whatsapp:',
            '',
            'i'
          ) AS phone,
          message,
          direction,
          status,
          "createdAt",
          metadata,
          "whatsappCustomerId"
        FROM "WhatsAppMessage"
        WHERE "createdAt" > ${cutoff}
      ),
      filtered AS (
        SELECT *
        FROM normalized
        WHERE phone IS NOT NULL
          AND phone <> ''
          AND phone <> 'business'
      ),
      latest AS (
        SELECT DISTINCT ON (phone)
          phone,
          message AS last_message,
          direction AS last_direction,
          status AS last_status,
          "createdAt" AS last_message_at,
          metadata AS last_metadata,
          "whatsappCustomerId" AS customer_id
        FROM filtered
        ORDER BY phone, "createdAt" DESC
      ),
      out_times AS (
        SELECT phone, MAX("createdAt") AS last_outbound_at
        FROM filtered
        WHERE direction = 'outbound'
        GROUP BY phone
      ),
      unread AS (
        SELECT f.phone, COUNT(*)::bigint AS unread_count
        FROM filtered f
        LEFT JOIN "WhatsAppStaffReadState" r
          ON REGEXP_REPLACE(r.phone, '^\\+', '') = REGEXP_REPLACE(f.phone, '^\\+', '')
          AND r."userId" = ${staffUserId}
        WHERE f.direction = 'inbound'
          AND (r."lastReadAt" IS NULL OR f."createdAt" > r."lastReadAt")
        GROUP BY f.phone
      )
      SELECT
        l.phone,
        c."firstName"            AS customer_first_name,
        c."lastName"             AS customer_last_name,
        l.last_metadata->>'contactName' AS meta_contact_name,
        l.last_message,
        l.last_message_at,
        l.last_direction,
        l.last_status,
        o.last_outbound_at,
        COALESCE(u.unread_count, 0)::bigint AS unread_count
      FROM latest l
      LEFT JOIN out_times o ON l.phone = o.phone
      LEFT JOIN unread u ON l.phone = u.phone
      LEFT JOIN "WhatsAppCustomer" c ON l.customer_id = c.id
      WHERE 1=1 ${cursorClause}
      ORDER BY l.last_message_at DESC, l.phone DESC
      LIMIT ${limit + 1};
    `);

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    const etag = buildEtag(sliced);
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const items: ConversationDto[] = sliced.map((r) => {
      const customerName =
        [r.customer_first_name, r.customer_last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        r.meta_contact_name ||
        null;
      return {
        phone: r.phone,
        customerName,
        lastMessage: r.last_message,
        lastMessageAt: r.last_message_at.toISOString(),
        lastDirection: r.last_direction,
        lastStatus: r.last_status,
        unreadCount: Number(r.unread_count),
        lastOutboundAt: r.last_outbound_at
          ? r.last_outbound_at.toISOString()
          : null,
      };
    });

    const nextCursor =
      hasMore && sliced.length > 0
        ? `${sliced[sliced.length - 1].last_message_at.toISOString()}|${sliced[sliced.length - 1].phone}`
        : null;

    return NextResponse.json(
      { items, nextCursor },
      { headers: { ETag: etag } },
    );
  } catch (error) {
    console.log("[MOBILE_WA_CONVERSATIONS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
