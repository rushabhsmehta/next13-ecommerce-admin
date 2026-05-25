import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const [variant, command, ...args] = process.argv.slice(2);

if (!variant || !["public", "staff", "finance"].includes(variant)) {
  console.error("Usage: node scripts/run-with-variant.mjs <public|staff|finance> <command> [...args]");
  process.exit(1);
}

if (!command) {
  console.error("Missing command to run.");
  process.exit(1);
}

const localBin = path.resolve(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? `${command}.cmd` : command
);
const executable = existsSync(localBin) ? localBin : command;

const child =
  process.platform === "win32"
    ? spawn(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/c", executable, ...args],
        {
          stdio: "inherit",
          env: {
            ...process.env,
            APP_VARIANT: variant,
          },
        }
      )
    : spawn(executable, args, {
        stdio: "inherit",
        env: {
          ...process.env,
          APP_VARIANT: variant,
        },
      });

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Command terminated with signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
