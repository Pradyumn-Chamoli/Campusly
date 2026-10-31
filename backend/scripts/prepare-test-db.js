// Creates or refreshes the test database before the suite runs.
//
// Uses `prisma db push` (not `migrate`) so the test schema always mirrors
// schema.prisma exactly, and a stale or partially populated test database is
// reset without touching migration history on the development database.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./../tests/setup-env.js";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaCli = path.join(backendDir, "node_modules", "prisma", "build", "index.js");

const dbName = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "");
console.log(`Preparing test database: ${dbName}`);

const result = spawnSync(
  process.execPath,
  [
    prismaCli,
    "db",
    "push",
    "--skip-generate",
    "--accept-data-loss",
    "--schema",
    path.join(backendDir, "prisma", "schema.prisma"),
  ],
  {
    cwd: backendDir,
    stdio: "inherit",
    env: process.env,
  }
);

process.exit(result.status ?? 1);
