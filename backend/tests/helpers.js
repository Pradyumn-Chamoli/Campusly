// Shared helpers for the API integration tests.
import "./setup-env.js";
import bcrypt from "bcryptjs";
import supertest from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";

export { prisma };
export const request = supertest(app);

// Dependency-ordered truncate of every application table. RESTART IDENTITY
// keeps auto-increment ids predictable, CASCADE clears any table added later
// that references these.
const TABLES = [
  '"reports"',
  '"requests"',
  '"messages"',
  '"conversations"',
  '"favorites"',
  '"listing_images"',
  '"listings"',
  '"users"',
];

// Each test file runs in its own process against the shared test database,
// so it empties the database first and stays independent of file order.
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`
  );
}

let counter = 0;
export function uniqueEmail(prefix = "user") {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@test.local`;
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// Inserts a user directly (bcrypt hashing included) — used where a test needs
// a specific role, e.g. an admin, without going through the public API.
export async function createUser({
  email = uniqueEmail(),
  password = "password123",
  name = "Test User",
  role = "STUDENT",
} = {}) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { email, passwordHash, name, role },
    select: { id: true, email: true, name: true, role: true },
  });
}

// Registers through the API, then logs in to obtain a bearer token, so tests
// exercise the real credential flow.
export async function registerUser(prefix = "user", overrides = {}) {
  const email = overrides.email ?? uniqueEmail(prefix);
  const password = overrides.password ?? "password123";

  const registered = await request.post("/api/auth/register").send({
    email,
    password,
    name: overrides.name ?? "Test User",
  });

  if (registered.status !== 201) {
    throw new Error(`Registration failed: ${registered.status} ${registered.text}`);
  }

  const login = await request.post("/api/auth/login").send({ email, password });
  if (login.status !== 200) {
    throw new Error(`Login failed: ${login.status} ${login.text}`);
  }

  return { token: login.body.data.token, user: login.body.data.user };
}

export async function createListing(token, overrides = {}) {
  const res = await request
    .post("/api/listings")
    .set(authHeader(token))
    .send({
      title: "Test Listing",
      description: "A listing created by the test suite",
      price: "25.00",
      category: "BOOKS",
      condition: "GOOD",
      ...overrides,
    });

  if (res.status !== 201) {
    throw new Error(`Listing creation failed: ${res.status} ${res.text}`);
  }

  return res.body.data;
}

// A minimal valid 1x1 PNG, for image upload tests.
export const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
