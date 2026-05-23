/**
 * Seed + verify customer tour chat test data.
 * Safe prefix: CHAT-TEST
 *
 * Usage:
 *   node tools/test-customer-tour-chat.mjs
 *   node tools/test-customer-tour-chat.mjs --cleanup
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();
const PREFIX = "CHAT-TEST";
const GROUP_NAME = `${PREFIX} Himachal Tour May 2026`;
const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:3000";
const TOKEN = process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN?.trim();
const BYPASS_USER = process.env.MOBILE_DEV_AUTH_BYPASS_USER_ID?.trim();

async function cleanup() {
  const groups = await prisma.chatGroup.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  for (const g of groups) {
    await prisma.chatMessage.deleteMany({ where: { chatGroupId: g.id } });
    await prisma.chatGroupInvite.deleteMany({ where: { chatGroupId: g.id } });
    await prisma.chatGroupMember.deleteMany({ where: { chatGroupId: g.id } });
    await prisma.chatGroup.delete({ where: { id: g.id } });
  }
  console.log(`Cleaned ${groups.length} ${PREFIX} group(s).`);
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: TOKEN ? `Bearer ${TOKEN}` : "",
      ...(opts.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text: text.slice(0, 300) };
}

async function main() {
  if (process.argv.includes("--cleanup")) {
    await cleanup();
    return;
  }

  const tourist = await prisma.travelAppUser.findFirst({
    where: { clerkUserId: BYPASS_USER, isApproved: true },
    select: { id: true, name: true, email: true },
  });
  if (!tourist) {
    throw new Error(
      `No approved TravelAppUser for MOBILE_DEV_AUTH_BYPASS_USER_ID (${BYPASS_USER}).`
    );
  }

  await cleanup();

  const adminMember = await prisma.travelAppUser.findFirst({
    where: { isApproved: true, NOT: { id: tourist.id } },
    select: { id: true, name: true },
  });

  const group = await prisma.chatGroup.create({
    data: {
      name: GROUP_NAME,
      description: "Customer tour chat test group",
      createdBy: tourist.id,
      tourStartDate: new Date("2026-05-27T00:00:00.000Z"),
      tourEndDate: new Date("2026-05-31T00:00:00.000Z"),
      members: {
        create: [
          { travelAppUserId: tourist.id, role: "ADMIN" },
          ...(adminMember
            ? [{ travelAppUserId: adminMember.id, role: "OPERATIONS" }]
            : []),
        ],
      },
    },
  });

  await prisma.chatMessage.create({
    data: {
      chatGroupId: group.id,
      senderId: adminMember?.id ?? tourist.id,
      messageType: "TEXT",
      content: "Welcome to your tour group! Share questions here during the trip.",
      isAnnouncement: !!adminMember,
    },
  });

  await prisma.chatMessage.create({
    data: {
      chatGroupId: group.id,
      senderId: tourist.id,
      messageType: "TEXT",
      content: "Thanks! Looking forward to Manali.",
    },
  });

  console.log("\n=== Seeded tour chat test data ===");
  console.log("Group:", group.name);
  console.log("Group ID:", group.id);
  console.log("Tourist:", tourist.name, tourist.email);
  if (adminMember) console.log("Admin:", adminMember.name);

  if (!TOKEN) {
    console.log("\n⚠️  MOBILE_DEV_AUTH_BYPASS_TOKEN not set — skipping API checks.");
    return;
  }

  let passed = 0;
  let failed = 0;
  function check(label, ok, detail = "") {
    console.log(`${ok ? "✅" : "❌"} ${label}${detail ? `: ${detail}` : ""}`);
    if (ok) passed++;
    else failed++;
  }

  console.log("\n=== API checks (customer / tourist) ===\n");

  const list = await api("/api/chat/groups");
  check("GET /api/chat/groups", list.status === 200, `status ${list.status}`);
  const found = list.json?.groups?.find((g) => g.id === group.id);
  check("Group visible in list", !!found, found?.name ?? "missing");
  // Bypass user is org ADMIN, so list API reports myRole ADMIN (not TOURIST).
  check(
    "Role resolved (ADMIN if org admin bypass user)",
    found?.myRole === "ADMIN" || found?.myRole === "TOURIST",
    found?.myRole
  );

  const detail = await api(`/api/chat/groups/${group.id}`);
  check("GET group detail", detail.status === 200, `status ${detail.status}`);
  check(
    "notificationsMuted default false",
    detail.json?.notificationsMuted === false,
    String(detail.json?.notificationsMuted)
  );

  const messages = await api(`/api/chat/groups/${group.id}/messages?limit=20`);
  check("GET messages", messages.status === 200, `status ${messages.status}`);
  check(
    "Has welcome + customer reply",
    (messages.json?.messages?.length ?? 0) >= 2,
    String(messages.json?.messages?.length)
  );

  const sendFixed = await api(`/api/chat/groups/${group.id}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messageType: "TEXT",
      content: "Can we get an early hotel check-in?",
    }),
  });
  check("POST customer message", sendFixed.status === 201, `status ${sendFixed.status}`);

  const mute = await api(`/api/chat/groups/${group.id}/members/me/notifications`, {
    method: "PATCH",
    body: JSON.stringify({ notificationsMuted: true }),
  });
  check("PATCH mute notifications", mute.status === 200, `status ${mute.status}`);

  const unmute = await api(`/api/chat/groups/${group.id}/members/me/notifications`, {
    method: "PATCH",
    body: JSON.stringify({ notificationsMuted: false }),
  });
  check("PATCH unmute notifications", unmute.status === 200, `status ${unmute.status}`);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  console.log("Mobile deep link:");
  console.log(`  aagamholidays://chat/${group.id}`);
  console.log("\nCleanup when done:");
  console.log("  node tools/test-customer-tour-chat.mjs --cleanup\n");

  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
