// Phase 13 — Reporting and admin moderation (docs/05 §14, docs/02 §13
// scenario E, decisions D5/D6).
import "./setup-env.js";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  request,
  resetDb,
  registerUser,
  createUser,
  createListing,
  authHeader,
  prisma,
} from "./helpers.js";

async function login(user) {
  const res = await request
    .post("/api/auth/login")
    .send({ email: user.email, password: "password123" });
  assert.equal(res.status, 200);
  return res.body.data.token;
}

function submitReport(token, listingId, overrides = {}) {
  return request
    .post("/api/reports")
    .set(authHeader(token))
    .send({
      listingId,
      reason: "MISLEADING",
      description: "Photos do not match the item",
      ...overrides,
    });
}

describe("reports and admin moderation", () => {
  let seller;
  let reporter;
  let otherUser;
  let adminToken;
  let listing;

  // A user may report a given listing only once (409 on duplicates), so tests
  // that need a fresh report register a fresh reporter.
  const freshReporter = () => registerUser("rep-sub");

  before(async () => {
    await resetDb();
    seller = await registerUser("rep-seller");
    reporter = await registerUser("rep-reporter");
    otherUser = await registerUser("rep-other");

    const admin = await createUser({ role: "ADMIN", name: "Marketplace Admin" });
    adminToken = await login(admin);

    listing = await createListing(seller.token, { title: "Reported Item" });
  });

  it("stores a valid report (scenario E)", async () => {
    const res = await submitReport(reporter.token, listing.id);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, "PENDING");
    assert.equal(res.body.data.reason, "MISLEADING");
  });

  it("rejects a duplicate report by the same user", async () => {
    const res = await submitReport(reporter.token, listing.id);
    assert.equal(res.status, 409);
    assert.match(res.body.error, /already reported/i);
  });

  it("accepts a report from a different user on the same listing", async () => {
    const res = await submitReport(otherUser.token, listing.id, {
      reason: "SPAM",
      description: "",
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.description, null); // empty description stored as null
  });

  it("shows reports to admins only", async () => {
    const noToken = await request.get("/api/reports");
    assert.equal(noToken.status, 401);

    const asStudent = await request.get("/api/reports").set(authHeader(reporter.token));
    assert.equal(asStudent.status, 403);

    const asAdmin = await request.get("/api/reports").set(authHeader(adminToken));
    assert.equal(asAdmin.status, 200);
    assert.ok(asAdmin.body.data.length >= 2);
    assert.equal(asAdmin.body.data[0].listing.title, "Reported Item");
  });

  it("lets only an admin resolve a report", async () => {
    const fresh = await freshReporter();
    const created = await submitReport(fresh.token, listing.id, {
      reason: "PROHIBITED",
    });
    const id = created.body.data.id;

    const asStudent = await request
      .put(`/api/reports/${id}/resolve`)
      .set(authHeader(reporter.token))
      .send({ action: "DISMISS" });
    assert.equal(asStudent.status, 403);
  });

  it("dismisses a report without touching the listing (D5)", async () => {
    const fresh = await freshReporter();
    const created = await submitReport(fresh.token, listing.id, {
      reason: "OTHER",
      description: "Checking the dismiss path",
    });
    const id = created.body.data.id;

    const resolved = await request
      .put(`/api/reports/${id}/resolve`)
      .set(authHeader(adminToken))
      .send({ action: "DISMISS" });

    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.data.status, "DISMISSED");

    const active = await request.get(`/api/listings/${listing.id}`);
    assert.equal(active.status, 200);
    assert.equal(active.body.data.status, "ACTIVE");
  });

  it("removes the listing when the admin chooses Remove (D4/D5)", async () => {
    const fresh = await freshReporter();
    const created = await submitReport(fresh.token, listing.id, {
      reason: "SPAM",
      description: "Remove this one",
    });

    const resolved = await request
      .put(`/api/reports/${created.body.data.id}/resolve`)
      .set(authHeader(adminToken))
      .send({ action: "REMOVE" });

    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.data.status, "REMOVED");

    // Hidden from the marketplace and from guests…
    const marketplace = await request.get("/api/listings");
    assert.ok(!marketplace.body.data.some((l) => l.id === listing.id));

    const asGuest = await request.get(`/api/listings/${listing.id}`);
    assert.equal(asGuest.status, 404);

    // …but visible in the admin queue.
    const queue = await request
      .get("/api/admin/listings/removed")
      .set(authHeader(adminToken));
    assert.equal(queue.status, 200);
    assert.ok(queue.body.data.some((l) => l.id === listing.id));
  });

  it("marks the listing Removed in the database", async () => {
    const row = await prisma.listing.findUnique({ where: { id: listing.id } });
    assert.equal(row.status, "REMOVED");
  });

  it("rejects resolving an already resolved report (atomic guard)", async () => {
    const fresh = await freshReporter();
    const created = await submitReport(fresh.token, listing.id, {
      reason: "OTHER",
      description: "Double resolve",
    });
    const id = created.body.data.id;

    const first = await request
      .put(`/api/reports/${id}/resolve`)
      .set(authHeader(adminToken))
      .send({ action: "DISMISS" });
    assert.equal(first.status, 200);

    const second = await request
      .put(`/api/reports/${id}/resolve`)
      .set(authHeader(adminToken))
      .send({ action: "REMOVE" });
    assert.equal(second.status, 422);
    assert.match(second.body.error, /already been resolved/i);
  });

  it("restricts the admin removed-listings queue to admins", async () => {
    const noToken = await request.get("/api/admin/listings/removed");
    assert.equal(noToken.status, 401);

    const asStudent = await request
      .get("/api/admin/listings/removed")
      .set(authHeader(reporter.token));
    assert.equal(asStudent.status, 403);
  });

  it("validates the report payload", async () => {
    const res = await request
      .post("/api/reports")
      .set(authHeader(reporter.token))
      .send({ listingId: listing.id, reason: "NOT_A_REASON" });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Validation failed");
  });

  it("requires authentication", async () => {
    assert.equal((await request.post("/api/reports").send({})).status, 401);
  });
});
