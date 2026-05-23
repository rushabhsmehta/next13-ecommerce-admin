/**
 * Verify chat mute + invite API flows against CHAT-TEST group.
 *
 * Usage:
 *   node tools/test-chat-mute-invite.mjs
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();
const PREFIX = "CHAT-TEST";
const BASE = "http://localhost:3000";
const TOKEN = process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN?.trim();

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
  return { status: res.status, json, text: text.slice(0, 400) };
}

async function ensureGroup() {
  let group = await prisma.chatGroup.findFirst({
    where: { name: { startsWith: PREFIX } },
    select: { id: true, name: true },
  });
  if (!group) {
    execSync("node tools/test-customer-tour-chat.mjs", { stdio: "inherit", cwd: process.cwd() });
    group = await prisma.chatGroup.findFirst({
      where: { name: { startsWith: PREFIX } },
      select: { id: true, name: true },
    });
  }
  if (!group) throw new Error("No CHAT-TEST group — run test-customer-tour-chat.mjs first");
  return group;
}

async function main() {
  if (!TOKEN) {
    throw new Error("MOBILE_DEV_AUTH_BYPASS_TOKEN required in .env.local");
  }

  const group = await ensureGroup();
  let passed = 0;
  let failed = 0;
  const check = (label, ok, detail = "") => {
    console.log(`${ok ? "✅" : "❌"} ${label}${detail ? `: ${detail}` : ""}`);
    if (ok) passed++;
    else failed++;
  };

  console.log(`\n=== Mute + invite API tests ===`);
  console.log(`Group: ${group.name} (${group.id})\n`);

  // --- Mute flow ---
  console.log("--- Mute notifications ---\n");

  const mute = await api(`/api/chat/groups/${group.id}/members/me/notifications`, {
    method: "PATCH",
    body: JSON.stringify({ notificationsMuted: true }),
  });
  check("PATCH mute → 200", mute.status === 200, `status ${mute.status}`);
  check("Response notificationsMuted true", mute.json?.notificationsMuted === true);

  const detailMuted = await api(`/api/chat/groups/${group.id}`);
  check(
    "GET group detail reflects muted",
    detailMuted.json?.notificationsMuted === true,
    String(detailMuted.json?.notificationsMuted)
  );

  const memberRow = await prisma.chatGroupMember.findFirst({
    where: {
      chatGroupId: group.id,
      travelAppUser: { clerkUserId: process.env.MOBILE_DEV_AUTH_BYPASS_USER_ID },
    },
    select: { notificationsMuted: true },
  });
  check("DB notificationsMuted true", memberRow?.notificationsMuted === true);

  const unmute = await api(`/api/chat/groups/${group.id}/members/me/notifications`, {
    method: "PATCH",
    body: JSON.stringify({ notificationsMuted: false }),
  });
  check("PATCH unmute → 200", unmute.status === 200, `status ${unmute.status}`);
  check("Response notificationsMuted false", unmute.json?.notificationsMuted === false);

  const detailUnmuted = await api(`/api/chat/groups/${group.id}`);
  check(
    "GET group detail reflects unmuted",
    detailUnmuted.json?.notificationsMuted === false,
    String(detailUnmuted.json?.notificationsMuted)
  );

  // --- Invite flow ---
  console.log("\n--- Guest invites ---\n");

  const inviteEmail = `chat-invite-test+${Date.now()}@example.com`;
  const inviteName = "Test Guest Companion";

  const createInvite = await api(`/api/chat/groups/${group.id}/invites`, {
    method: "POST",
    body: JSON.stringify({
      invitedName: inviteName,
      invitedEmail: inviteEmail,
      role: "COMPANION",
    }),
  });
  check("POST create invite → 201", createInvite.status === 201, `status ${createInvite.status}`);
  const inviteId = createInvite.json?.id;
  check("Invite has id", !!inviteId, inviteId ?? "missing");

  const listInvites = await api(`/api/chat/groups/${group.id}/invites`);
  check("GET pending invites → 200", listInvites.status === 200, `status ${listInvites.status}`);
  const pending = listInvites.json?.invites ?? [];
  check(
    "Pending list includes new invite",
    pending.some((i) => i.id === inviteId && i.invitedName === inviteName),
    `${pending.length} pending`
  );

  const duplicate = await api(`/api/chat/groups/${group.id}/invites`, {
    method: "POST",
    body: JSON.stringify({
      invitedName: inviteName,
      invitedEmail: inviteEmail,
      role: "COMPANION",
    }),
  });
  check("Duplicate invite → 409", duplicate.status === 409, `status ${duplicate.status}`);

  const cancel = await api(`/api/chat/groups/${group.id}/invites/${inviteId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "cancel" }),
  });
  check("PATCH cancel invite → 200", cancel.status === 200, `status ${cancel.status}`);

  const afterCancel = await api(`/api/chat/groups/${group.id}/invites`);
  check(
    "Invite removed from pending list",
    !(afterCancel.json?.invites ?? []).some((i) => i.id === inviteId),
    `${(afterCancel.json?.invites ?? []).length} pending`
  );

  // --- Invite auto-accept ---
  console.log("\n--- Invite auto-accept on login ---\n");

  const bypassClerkId = process.env.MOBILE_DEV_AUTH_BYPASS_USER_ID?.trim();
  const membersInGroup = await prisma.chatGroupMember.findMany({
    where: { chatGroupId: group.id, isActive: true },
    select: { travelAppUserId: true },
  });
  const memberIds = new Set(membersInGroup.map((m) => m.travelAppUserId));

  const acceptTarget = await prisma.travelAppUser.findFirst({
    where: {
      isApproved: true,
      id: { notIn: [...memberIds] },
      email: { contains: "@" },
    },
    select: { id: true, name: true, email: true },
  });

  if (!acceptTarget) {
    console.log("⚠️  Skipping auto-accept test — no approved user outside group");
  } else {
    const acceptEmail = acceptTarget.email.toLowerCase();
    const acceptInvite = await api(`/api/chat/groups/${group.id}/invites`, {
      method: "POST",
      body: JSON.stringify({
        invitedName: acceptTarget.name,
        invitedEmail: acceptEmail,
        role: "TOURIST",
      }),
    });
    check("POST invite for existing user → 201", acceptInvite.status === 201, `status ${acceptInvite.status}`);

    execSync(
      `npx ts-node --transpile-only -e "const prismadb=require('./src/lib/prismadb').default; const {acceptMatchingChatInvites}=require('./src/lib/chat-invites'); acceptMatchingChatInvites(prismadb,'${acceptTarget.id}').then(n=>{console.log('accepted',n);process.exit(0);}).catch(e=>{console.error(e);process.exit(1);});"`,
      { cwd: process.cwd(), stdio: "pipe", encoding: "utf8" }
    );

    const acceptedInvite = await prisma.chatGroupInvite.findUnique({
      where: { id: acceptInvite.json.id },
      select: { status: true, acceptedTravelAppUserId: true },
    });
    check("Invite status ACCEPTED", acceptedInvite?.status === "ACCEPTED", acceptedInvite?.status);
    check(
      "acceptedTravelAppUserId set",
      acceptedInvite?.acceptedTravelAppUserId === acceptTarget.id,
      acceptedInvite?.acceptedTravelAppUserId
    );

    const newMember = await prisma.chatGroupMember.findUnique({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: group.id,
          travelAppUserId: acceptTarget.id,
        },
      },
      select: { isActive: true, role: true },
    });
    check("User added as group member", newMember?.isActive === true, newMember?.role);

    // Cleanup: remove auto-added member so re-runs stay idempotent
    if (newMember) {
      await prisma.chatGroupMember.update({
        where: {
          chatGroupId_travelAppUserId: {
            chatGroupId: group.id,
            travelAppUserId: acceptTarget.id,
          },
        },
        data: { isActive: false, leftAt: new Date() },
      });
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  console.log("Device walkthrough:");
  console.log(`  node mobile/scripts/adb-chat-mute-invite-test.mjs`);
  console.log(`  Settings: aagamholidays://chat-settings/${group.id}\n`);

  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
