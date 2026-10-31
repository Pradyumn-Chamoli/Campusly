// Test environment setup.
//
// This module must run before any `src/` module is imported: it points
// Prisma at the dedicated test database and marks the process as test
// (which raises rate limits and silences request logging). Every test file
// therefore imports it as its first import, and `scripts/prepare-test-db.js`
// reuses it so setup and tests always target the same database.
import "dotenv/config";

// Derives the test database URL from the development one: same server and
// credentials, database name suffixed with `_test`. Can be overridden
// explicitly with DATABASE_URL_TEST.
export function deriveTestDatabaseUrl(url) {
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  parsed.pathname = `/${name}_test`;
  return parsed.toString();
}

const devUrl = process.env.DATABASE_URL;
if (!devUrl) {
  throw new Error("DATABASE_URL must be set in backend/.env to run tests");
}

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || deriveTestDatabaseUrl(devUrl);
