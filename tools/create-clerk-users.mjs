/**
 * Create Clerk users by email (Backend API). Skips emails that already exist.
 *
 * Usage:
 *   node tools/create-clerk-users.mjs
 *   node tools/create-clerk-users.mjs --dry-run
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");

const EMAILS = [
  "info@aagamholidays.com",
  "sureshrmehta1950@gmail.com",
  "rushabhsmehat@gmail.com",
  "shahshivangi489@gmail.com",
  "shahnawszshaikh@gmail.com",
  "somanishrenik6987@gmail.com",
  "kpap24@gmail.com",
  "bhavin14288@gmail.com",
  "mehtarushabh2310@gmail.com",
  "aagamholiday@gmail.com",
];

const secret = process.env.CLERK_SECRET_KEY?.trim();
if (!secret) {
  console.error("CLERK_SECRET_KEY is not set in .env / .env.local");
  process.exit(1);
}

function localPart(email) {
  const base = email.split("@")[0] ?? "User";
  const cleaned = base.replace(/[._+-]/g, " ").trim();
  const word = cleaned.split(/\s+/).filter(Boolean)[0] ?? "User";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

async function clerkFetch(path, options = {}) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function findUserByEmail(email) {
  const q = encodeURIComponent(email);
  const { res, body } = await clerkFetch(
    `/users?email_address=${q}&limit=1`
  );
  if (!res.ok) {
    throw new Error(
      `List users failed (${res.status}): ${JSON.stringify(body)}`
    );
  }
  const users = body?.data ?? body ?? [];
  return Array.isArray(users) ? users[0] : null;
}

async function createUser(email) {
  const firstName = localPart(email);
  const payload = {
    email_address: [email],
    first_name: firstName,
    skip_password_requirement: true,
    skip_password_checks: true,
  };

  if (DRY_RUN) {
    console.log("[dry-run] would create:", email, payload);
    return { status: "dry-run", email };
  }

  const { res, body } = await clerkFetch("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    const id = body?.id ?? body?.user_id;
    return { status: "created", email, id };
  }

  const errMsg =
    typeof body === "object"
      ? JSON.stringify(body.errors ?? body)
      : String(body);

  if (
    res.status === 422 &&
    /already exists|taken|duplicate/i.test(errMsg)
  ) {
    const existing = await findUserByEmail(email);
    return {
      status: "exists",
      email,
      id: existing?.id,
    };
  }

  throw new Error(`Create failed for ${email} (${res.status}): ${errMsg}`);
}

async function main() {
  const keyPrefix = secret.slice(0, 8);
  console.log(`Clerk secret: ${keyPrefix}… (${secret.startsWith("sk_live") ? "live" : "test"})`);
  if (DRY_RUN) console.log("DRY RUN — no users will be created\n");

  const results = [];
  for (const email of EMAILS) {
    try {
      const existing = DRY_RUN ? null : await findUserByEmail(email);
      if (existing?.id) {
        results.push({
          status: "exists",
          email,
          id: existing.id,
        });
        console.log(`✓ ${email} — already exists (${existing.id})`);
        continue;
      }

      const r = await createUser(email);
      results.push(r);
      const label =
        r.status === "created"
          ? `created (${r.id})`
          : r.status === "exists"
            ? `exists (${r.id})`
            : r.status;
      console.log(`✓ ${email} — ${label}`);
    } catch (e) {
      results.push({ status: "error", email, error: e.message });
      console.error(`✗ ${email} — ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log("\n--- Summary ---");
  for (const r of results) {
    console.log(`${r.status.padEnd(8)} ${r.email}${r.id ? `  ${r.id}` : ""}`);
  }

  const failed = results.filter((r) => r.status === "error");
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
