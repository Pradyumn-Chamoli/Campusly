// Phase 13 — Favorites/wishlist (docs/05 §11, docs/02 §13 scenario D).
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

describe("favorites", () => {
  let owner;
  let saver;
  let other;
  let listing;

  before(async () => {
    await resetDb();
    owner = await registerUser("fav-owner");
    saver = await registerUser("fav-saver");
    other = await registerUser("fav-other");
    listing = await createListing(owner.token, { title: "Saved Item" });
  });

  it("favorites a listing and shows it in the favorites list (scenario D)", async () => {
    const add = await request
      .post("/api/favorites")
      .set(authHeader(saver.token))
      .send({ listingId: listing.id });
    assert.equal(add.status, 201);

    const res = await request.get("/api/favorites").set(authHeader(saver.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].listing.id, listing.id);
    assert.equal(res.body.data[0].listing.title, "Saved Item");
    assert.equal(res.body.data[0].listing.price, 25);
  });

  it("rejects favoriting the same listing twice", async () => {
    const res = await request
      .post("/api/favorites")
      .set(authHeader(saver.token))
      .send({ listingId: listing.id });

    assert.equal(res.status, 409);
    assert.match(res.body.error, /already saved/i);
  });

  it("does not expose one user's favorites to another", async () => {
    const res = await request.get("/api/favorites").set(authHeader(other.token));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
  });

  it("lets a user remove only their own favorite", async () => {
    // Another user trying to remove the saver's favorite changes nothing.
    const attempt = await request
      .delete(`/api/favorites/${listing.id}`)
      .set(authHeader(other.token));
    assert.equal(attempt.status, 404);

    const stillSaved = await request.get("/api/favorites").set(authHeader(saver.token));
    assert.equal(stillSaved.body.data.length, 1);

    const removed = await request
      .delete(`/api/favorites/${listing.id}`)
      .set(authHeader(saver.token));
    assert.equal(removed.status, 204);

    const second = await request
      .delete(`/api/favorites/${listing.id}`)
      .set(authHeader(saver.token));
    assert.equal(second.status, 404);
  });

  it("rejects a favorite on a nonexistent listing", async () => {
    const res = await request
      .post("/api/favorites")
      .set(authHeader(saver.token))
      .send({ listingId: 999999 });

    assert.equal(res.status, 404);
  });

  it("requires authentication", async () => {
    assert.equal((await request.get("/api/favorites")).status, 401);
    assert.equal(
      (await request.post("/api/favorites").send({ listingId: listing.id })).status,
      401
    );
  });
});
