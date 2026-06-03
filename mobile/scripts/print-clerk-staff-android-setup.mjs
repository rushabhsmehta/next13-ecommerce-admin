#!/usr/bin/env node
/**
 * Prints copy-paste values for Clerk Native applications (Aagam Operations / staff).
 * Run: node scripts/print-clerk-staff-android-setup.mjs
 *
 * Clerk Dashboard: Configure → Native applications
 * https://dashboard.clerk.com (switch to your PRODUCTION instance for Play Store builds)
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(__dirname, "..");

const PACKAGE = "com.aagamholidays.staff";
const REDIRECT_ALLOWLIST = [
  "aagamstaff://oauth-native-callback",
  "aagamstaff://sso-callback",
  "clerk://com.aagamholidays.staff.callback",
];

function sha256FromKeystore(keystorePath, alias, storepass, keypass) {
  if (!existsSync(keystorePath)) return null;
  const out = execSync(
    `keytool -list -v -keystore "${keystorePath}" -alias ${alias} -storepass ${storepass} -keypass ${keypass}`,
    { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }
  );
  const m = out.match(/SHA256:\s*([0-9A-F:]+)/i);
  return m ? m[1].toUpperCase() : null;
}

const debugKeystore = join(mobileRoot, "android", "app", "debug.keystore");
const debugSha = sha256FromKeystore(debugKeystore, "androiddebugkey", "android", "android");

function readKeystoreProps() {
  const propsPath = join(mobileRoot, "android", "keystore.properties");
  if (!existsSync(propsPath)) return null;
  const text = readFileSync(propsPath, "utf8");
  const get = (key) => text.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim();
  const storeFile = get("storeFile");
  const storePassword = get("storePassword");
  const keyAlias = get("keyAlias");
  const keyPassword = get("keyPassword");
  if (!storeFile || !storePassword || !keyAlias || !keyPassword) return null;
  const keystorePath = join(mobileRoot, "android", storeFile);
  return { keystorePath, storePassword, keyAlias, keyPassword };
}

const releaseProps = readKeystoreProps();
const releaseSha = releaseProps
  ? sha256FromKeystore(
      releaseProps.keystorePath,
      releaseProps.keyAlias,
      releaseProps.storePassword,
      releaseProps.keyPassword
    )
  : null;

console.log("=== Aagam Operations — Clerk Native applications setup ===\n");
console.log("Dashboard: Clerk → your PRODUCTION instance → Configure → Native applications\n");

console.log("1) Enable: Native API\n");

console.log("2) Add Android application:");
console.log(`   Package name: ${PACKAGE}`);
if (debugSha) {
  console.log(`   SHA-256 (debug keystore — local debug APK only):`);
  console.log(`   ${debugSha}\n`);
}
if (releaseSha) {
  console.log(`   SHA-256 (EAS/upload keystore — add if you sideload release builds):`);
  console.log(`   ${releaseSha}\n`);
}
console.log("   SHA-256 (Play App Signing — REQUIRED for Play Store / Closed testing):");
console.log("   6C:2F:C4:D8:36:28:89:89:74:56:68:19:B7:0F:08:17:B5:10:DB:CF:E2:B6:D9:01:58:29:C4:8C:BE:B6:64:FB");
console.log("   SHA-1 for Google Cloud Android OAuth client:");
console.log("   00:C4:C5:C6:02:B6:4A:37:1F:99:17:64:6E:81:6E:3A:6D:D3:7A:06\n");

console.log("3) Allowlist for mobile SSO redirect (add each line):");
for (const url of REDIRECT_ALLOWLIST) {
  console.log(`   ${url}`);
}
console.log("");

console.log("4) User & authentication → Social connections → Google → Enabled\n");

console.log("5) EAS production-staff should use pk_live_… (not pk_test):");
console.log("   cd mobile && set APP_VARIANT=staff && npx eas env:list --environment production\n");

console.log("=== After saving in Clerk ===");
console.log("Force-close Aagam Operations → try Continue with Google again.\n");
