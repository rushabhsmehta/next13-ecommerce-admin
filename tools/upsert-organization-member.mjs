/**
 * Upsert OrganizationMember (CLI). userId must be a Clerk user id (user_...).
 *
 * Usage:
 *   node tools/upsert-organization-member.mjs --org=<uuid> --user=<clerk_user_id> --role=ADMIN [--email=name@example.com] [--inactive]
 *
 * Env: DATABASE_URL (same as the Next.js app).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLES = new Set(["OWNER", "ADMIN", "FINANCE", "OPERATIONS", "VIEWER"]);

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
    else if (a === "--inactive") out.inactive = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const { org: organizationId, user: userId, role, email } = args;
  if (!organizationId || !userId || !role) {
    console.error(
      "Usage: node tools/upsert-organization-member.mjs --org=<uuid> --user=<clerk_user_id> --role=ADMIN [--email=...] [--inactive]"
    );
    process.exit(1);
  }
  if (!ROLES.has(role)) {
    console.error(`Invalid role. Must be one of: ${[...ROLES].join(", ")}`);
    process.exit(1);
  }
  if (!userId.startsWith("user_")) {
    console.warn(
      "[warn] userId does not look like a Clerk id (expected prefix user_). Continuing anyway."
    );
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    console.error("Organization not found:", organizationId);
    process.exit(1);
  }

  const isActive = !args.inactive;
  const row = await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    create: {
      organizationId,
      userId,
      role,
      email: email || null,
      isActive,
    },
    update: {
      role,
      ...(email !== undefined ? { email: email || null } : {}),
      isActive,
    },
  });

  console.log("Upserted OrganizationMember:", row);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
