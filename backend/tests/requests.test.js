// Phase 13 — Request/transaction flow: the five-state lifecycle and its
// role-based permissions (docs/05 §13, docs/06 decisions D1/D2, FR-15).
import "./setup-env.js";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  request,
  resetDb,
  registerUser,
  createListing,
  authHeader,
} from "./helpers.js";

async function createRequest(token, listingId, note) {
  return request
    .post("/api/requests")
    .set(authHeader(token))
    .send({ listingId, note });
}

function setStatus(token, id, status) {
  return request
    .put(`/api/requests/${id}/status`)
    .set(authHeader(token))
    .send({ status });
}

describe("request flow", () => {
  let seller;
  let buyer;
  let outsider;
  let activeListing;
  let soldListing;

  before(async () => {
    await resetDb();
    seller = await registerUser("req-seller");
    buyer = await registerUser("req-buyer");
    outsider = await registerUser("req-outsider");

    activeListing = await createListing(seller.token, { title: "Available Item" });
    soldListing = await createListing(seller.token, { title: "Gone Item" });
    await request
      .put(`/api/listings/${soldListing.id}`)
      .set(authHeader(seller.token))
      .send({ status: "SOLD" });
  });

  it("creates a pending request as the buyer", async () => {
    const res = await createRequest(buyer.token, activeListing.id, "Still available?");

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, "PENDING");
    assert.equal(res.body.data.buyer.name, "Test User");
    assert.equal(res.body.data.listing.title, "Available Item");
  });

  it("rejects a request on the seller's own listing", async () => {
    const res = await createRequest(seller.token, activeListing.id);
    assert.equal(res.status, 403);
    assert.match(res.body.error, /own listing/i);
  });

  it("rejects a request on an inactive listing", async () => {
    const res = await createRequest(buyer.token, soldListing.id);
    assert.equal(res.status, 422);
    assert.match(res.body.error, /not active/i);
  });

  it("scopes the request list to the caller", async () => {
    const asBuyer = await createRequest(buyer.token, activeListing.id, "First ask");
    await setStatus(seller.token, asBuyer.body.data.id, "ACCEPTED");

    const buyerList = await request.get("/api/requests").set(authHeader(buyer.token));
    assert.equal(buyerList.status, 200);
    assert.ok(buyerList.body.data.length >= 2);
    assert.ok(buyerList.body.data.every((r) => r.buyer.id === buyer.user.id));

    const sellerList = await request.get("/api/requests").set(authHeader(seller.token));
    assert.ok(sellerList.body.data.every((r) => r.seller.id === seller.user.id));

    const roleFiltered = await request
      .get("/api/requests?role=seller")
      .set(authHeader(seller.token));
    assert.ok(roleFiltered.body.data.every((r) => r.seller.id === seller.user.id));

    const outsiderList = await request
      .get("/api/requests")
      .set(authHeader(outsider.token));
    assert.deepEqual(outsiderList.body.data, []);
  });

  it("lets only the seller accept a pending request (D2)", async () => {
    const created = await createRequest(buyer.token, activeListing.id, "Buyer tries first");
    const id = created.body.data.id;

    const buyerAttempt = await setStatus(buyer.token, id, "ACCEPTED");
    assert.equal(buyerAttempt.status, 403);
    assert.match(buyerAttempt.body.error, /not authorized/i);

    const sellerAccepts = await setStatus(seller.token, id, "ACCEPTED");
    assert.equal(sellerAccepts.status, 200);
    assert.equal(sellerAccepts.body.data.status, "ACCEPTED");
  });

  it("rejects status changes from non-participants", async () => {
    const created = await createRequest(buyer.token, activeListing.id, "Private");
    const id = created.body.data.id;

    const res = await setStatus(outsider.token, id, "ACCEPTED");
    assert.equal(res.status, 403);
    assert.match(res.body.error, /not a participant/i);
  });

  it("rejects invalid transitions with 422 (D1)", async () => {
    const created = await createRequest(buyer.token, activeListing.id, "Jump the gun");
    const id = created.body.data.id;

    const jump = await setStatus(buyer.token, id, "COMPLETED");
    assert.equal(jump.status, 422);
    assert.match(jump.body.error, /invalid status transition/i);
  });

  it("lets the buyer cancel only while pending (D2)", async () => {
    const created = await createRequest(buyer.token, activeListing.id, "Cancel me");
    const id = created.body.data.id;

    const cancelled = await setStatus(buyer.token, id, "CANCELLED");
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.status, "CANCELLED");

    // Terminal: no further transitions are possible.
    const after = await setStatus(seller.token, id, "ACCEPTED");
    assert.equal(after.status, 422);
  });

  it("lets the seller reject a pending request", async () => {
    const created = await createRequest(buyer.token, activeListing.id, "Reject me");
    const id = created.body.data.id;

    const rejected = await setStatus(seller.token, id, "REJECTED");
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.data.status, "REJECTED");
  });

  it("lets either participant complete an accepted request (D1/D2)", async () => {
    // Buyer completes.
    const first = await createRequest(buyer.token, activeListing.id, "Deal 1");
    await setStatus(seller.token, first.body.data.id, "ACCEPTED");
    const byBuyer = await setStatus(buyer.token, first.body.data.id, "COMPLETED");
    assert.equal(byBuyer.status, 200);
    assert.equal(byBuyer.body.data.status, "COMPLETED");

    // Seller completes.
    const second = await createRequest(buyer.token, activeListing.id, "Deal 2");
    await setStatus(seller.token, second.body.data.id, "ACCEPTED");
    const bySeller = await setStatus(seller.token, second.body.data.id, "COMPLETED");
    assert.equal(bySeller.status, 200);
    assert.equal(bySeller.body.data.status, "COMPLETED");
  });

  it("filters the list by status", async () => {
    const res = await request
      .get("/api/requests?status=COMPLETED")
      .set(authHeader(seller.token));

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 2);
    assert.ok(res.body.data.every((r) => r.status === "COMPLETED"));
  });

  it("validates the create payload", async () => {
    const res = await request
      .post("/api/requests")
      .set(authHeader(buyer.token))
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Validation failed");
  });

  it("requires authentication", async () => {
    assert.equal((await request.get("/api/requests")).status, 401);
    assert.equal((await request.post("/api/requests").send({})).status, 401);
  });
});
