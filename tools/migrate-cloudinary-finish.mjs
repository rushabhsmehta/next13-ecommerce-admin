/**
 * Wait for Cloudinary->R2 upload job to finish, then rewrite DB URLs.
 * Usage: node tools/migrate-cloudinary-finish.mjs
 */
import { readFileSync, existsSync } from "fs";
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAP_PATH = join(__dirname, ".cloudinary-r2-map.json");
const LOG_PATH = join(__dirname, "migrate-cloudinary-run.log");

function countMapped() {
  if (!existsSync(MAP_PATH)) return 0;
  return Object.keys(JSON.parse(readFileSync(MAP_PATH, "utf8"))).length;
}

function runApplyMapOnly() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["tools/migrate-cloudinary-to-r2.mjs", "--apply-map-only"], {
      cwd: join(__dirname, ".."),
      stdio: "inherit",
      shell: false,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`apply-map-only exited with code ${code}`));
    });
  });
}

async function main() {
  let stable = 0;
  let last = countMapped();
  console.log(`Watching migration map (current: ${last})...`);

  while (stable < 6) {
    await new Promise((r) => setTimeout(r, 30_000));
    const current = countMapped();
    if (current === last) {
      stable += 1;
    } else {
      stable = 0;
      last = current;
      console.log(`  mapped: ${current}`);
    }
  }

  console.log(`\nUploads appear complete (${last} URLs mapped). Applying database updates...`);
  await runApplyMapOnly();
  console.log("\nMigration finish step complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
