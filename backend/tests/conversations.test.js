// Phase 13 — Chat: conversations, messages, participant-only access
// (docs/05 §12, docs/02 FR-12..FR-14).
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

function startConversation(token, listingId) {
  return request
    .post("/api/conversations")
    .set(authHeader(token))
    .send({ listingId });
}

describe("conversations and messages", () => {
  let seller;
  let buyer;
  let outsider;
  let activeListing;
  let soldListing;
  let conversation;

  before(async () => {
    await resetDb();
    seller = await registerUser("chat-seller");
    buyer = await registerUser("chat-buyer");
    outsider = await registerUser("chat-outsider");

    activeListing = await createListing(seller.token, { title: "Chattable Item" });
    soldListing = await createListing(seller.token, { title: "Retired Item" });
    await request
      .put(`/api/listings/${soldListing.id}`)
      .set(authHeader(seller.token))
      .send({ status: "SOLD" });
  });

  it("starts a conversation about an active listing", async () => {
    const res = await startConversation(buyer.token, activeListing.id);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.buyer.id, buyer.user.id);
    assert.equal(res.body.data.seller.id, seller.user.id);
    assert.equal(res.body.data.listing.title, "Chattable Item");
    conversation = res.body.data;
  });

  it("returns the existing conversation instead of creating a duplicate", async () => {
    const res = await startConversation(buyer.token, activeListing.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, conversation.id);
  });

  it("rejects a conversation on the seller's own listing", async () => {
    const res = await startConversation(seller.token, activeListing.id);
    assert.equal(res.status, 403);
    assert.match(res.body.error, /own listing/i);
  });

  it("rejects a conversation on an inactive listing", async () => {
    const res = await startConversation(buyer.token, soldListing.id);
    assert.equal(res.status, 422);
  });

  it("sends and persists messages for participants", async () => {
    const sent = await request
      .post(`/api/conversations/${conversation.id}/messages`)
      .set(authHeader(buyer.token))
      .send({ body: "  Is this still available?  " });

    assert.equal(sent.status, 201);
    assert.equal(sent.body.data.body, "Is this still available?"); // trimmed
    assert.equal(sent.body.data.senderId, buyer.user.id);

    await request
      .post(`/api/conversations/${conversation.id}/messages`)
      .set(authHeader(seller.token))
      .send({ body: "Yes, it is!" });

    // Message history survives a fresh read (persistence).
    const history = await request
      .get(`/api/conversations/${conversation.id}/messages`)
      .set(authHeader(buyer.token));

    assert.equal(history.status, 200);
    assert.equal(history.body.data.length, 2);
    assert.equal(history.body.data[0].body, "Is this still available?");
    assert.equal(history.body.data[1].body, "Yes, it is!");
  });

  it("shows the conversation with its last message in the list", async () => {
    const res = await request.get("/api/conversations").set(authHeader(buyer.token));

    assert.equal(res.status, 200);
    const entry = res.body.data.find((c) => c.id === conversation.id);
    assert.ok(entry);
    assert.equal(entry.lastMessage.body, "Yes, it is!");
    assert.equal(entry.lastMessage.senderId, seller.user.id);
  });

  it("blocks non-participants from reading the conversation", async () => {
    const detail = await request
      .get(`/api/conversations/${conversation.id}`)
      .set(authHeader(outsider.token));
    assert.equal(detail.status, 403);

    const messages = await request
      .get(`/api/conversations/${conversation.id}/messages`)
      .set(authHeader(outsider.token));
    assert.equal(messages.status, 403);

    const list = await request.get("/api/conversations").set(authHeader(outsider.token));
    assert.deepEqual(list.body.data, []);
  });

  it("blocks non-participants from sending messages", async () => {
    const res = await request
      .post(`/api/conversations/${conversation.id}/messages`)
      .set(authHeader(outsider.token))
      .send({ body: "Should not go through" });

    assert.equal(res.status, 403);
  });

  it("returns 404 for a conversation that does not exist", async () => {
    const res = await request
      .get("/api/conversations/999999")
      .set(authHeader(buyer.token));

    assert.equal(res.status, 404);
  });

  it("validates the message body", async () => {
    const res = await request
      .post(`/api/conversations/${conversation.id}/messages`)
      .set(authHeader(buyer.token))
      .send({ body: "" });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Validation failed");
  });

  it("requires authentication", async () => {
    assert.equal((await request.get("/api/conversations")).status, 401);
    assert.equal(
      (await request.post("/api/conversations").send({ listingId: 1 })).status,
      401
    );
  });
});
