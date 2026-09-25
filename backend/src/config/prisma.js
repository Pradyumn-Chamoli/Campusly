import { PrismaClient } from "@prisma/client";

// Single shared Prisma client for the whole backend process.
// Reused by controllers and middleware so we do not open a new
// connection pool per module.
const prisma = new PrismaClient();

export default prisma;
