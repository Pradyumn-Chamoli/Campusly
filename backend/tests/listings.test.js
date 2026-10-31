// Phase 13 — Listings: CRUD, ownership authorization, search/filter
// (docs/05 §9–10, docs/02 §13 scenarios A–C).
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

describe("listings", () => {
  let seller;
  let stranger;

  before(async () => {
    await resetDb();
    seller = await registerUser("seller");
    stranger = await registerUser("stranger");
  });

  describe("creation (scenario A)", () => {
    it("creates a listing that appears in the marketplace", async () => {
      const res = await request
        .post("/api/listings")
        .set(authHeader(seller.token))
        .send({
          title: "Calculus Textbook",
          description: "Barely used first-year calculus text",
          price: "30.00",
          category: "BOOKS",
          condition: "LIKE_NEW",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, "ACTIVE");
      assert.equal(res.body.data.price, 30); // serialized as a plain number

      const marketplace = await request.get("/api/listings");
      assert.equal(marketplace.status, 200);
      assert.ok(
        marketplace.body.data.some((l) => l.title === "Calculus Textbook"),
        "new listing should be listed"
      );
    });

    it("rejects unauthenticated creation", async () => {
      const res = await request.post("/api/listings").send({
        title: "Nope",
        description: "Should not be created",
        price: "10.00",
        category: "BOOKS",
        condition: "GOOD",
      });

      assert.equal(res.status, 401);
    });

    it("rejects invalid listing payloads with field details", async () => {
      const res = await request
        .post("/api/listings")
        .set(authHeader(seller.token))
        .send({ title: "", description: "", price: "-5", category: "ROCKETS" });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
      const fields = res.body.details.map((d) => d.field);
      for (const field of ["title", "description", "price", "category"]) {
        assert.ok(fields.includes(field), `expected an error for ${field}`);
      }
    });
  });

  describe("ownership authorization (scenario B)", () => {
    it("rejects an edit by a user who does not own the listing", async () => {
      const listing = await createListing(seller.token, { title: "Owned Item" });

      const res = await request
        .put(`/api/listings/${listing.id}`)
        .set(authHeader(stranger.token))
        .send({ title: "Hijacked" });

      assert.equal(res.status, 403);
      const [row] = await prisma.$queryRawUnsafe(
        "SELECT title FROM listings WHERE id = $1",
        listing.id
      );
      assert.equal(row.title, "Owned Item");
    });

    it("rejects a delete by a user who does not own the listing", async () => {
      const listing = await createListing(seller.token, { title: "Keep Me" });

      const res = await request
        .delete(`/api/listings/${listing.id}`)
        .set(authHeader(stranger.token));

      assert.equal(res.status, 403);
      assert.ok(await prisma.listing.findUnique({ where: { id: listing.id } }));
    });

    it("allows the owner to edit and delete", async () => {
      const listing = await createListing(seller.token, { title: "Editable" });

      const updated = await request
        .put(`/api/listings/${listing.id}`)
        .set(authHeader(seller.token))
        .send({ title: "Edited Title" });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.data.title, "Edited Title");

      const deleted = await request
        .delete(`/api/listings/${listing.id}`)
        .set(authHeader(seller.token));
      assert.equal(deleted.status, 204);
      assert.equal(await prisma.listing.findUnique({ where: { id: listing.id } }), null);
    });
  });

  describe("status lifecycle (docs/06 D4)", () => {
    it("lets a seller mark a listing Sold but not Removed", async () => {
      const listing = await createListing(seller.token, { title: "Status Item" });

      const removedAttempt = await request
        .put(`/api/listings/${listing.id}`)
        .set(authHeader(seller.token))
        .send({ status: "REMOVED" });
      assert.equal(removedAttempt.status, 422);

      const sold = await request
        .put(`/api/listings/${listing.id}`)
        .set(authHeader(seller.token))
        .send({ status: "SOLD" });
      assert.equal(sold.status, 200);
      assert.equal(sold.body.data.status, "SOLD");

      // Sold listings disappear from the marketplace.
      const marketplace = await request.get("/api/listings");
      assert.ok(!marketplace.body.data.some((l) => l.id === listing.id));
    });

    it("hides removed listings from guests but shows them to admins", async () => {
      const admin = await createUser({ role: "ADMIN", name: "Admin" });
      const login = await request
        .post("/api/auth/login")
        .send({ email: admin.email, password: "password123" });
      assert.equal(login.status, 200);
      const adminToken = login.body.data.token;

      const listing = await createListing(seller.token, { title: "Flagged Item" });
      await prisma.listing.update({
        where: { id: listing.id },
        data: { status: "REMOVED" },
      });

      const asGuest = await request.get(`/api/listings/${listing.id}`);
      assert.equal(asGuest.status, 404);

      const asOwner = await request
        .get(`/api/listings/${listing.id}`)
        .set(authHeader(seller.token));
      assert.equal(asOwner.status, 404);

      const asAdmin = await request
        .get(`/api/listings/${listing.id}`)
        .set(authHeader(adminToken));
      assert.equal(asAdmin.status, 200);
      assert.equal(asAdmin.body.data.status, "REMOVED");
    });
  });

  describe("search and filters (scenario C)", () => {
    let searchSeller;

    before(async () => {
      searchSeller = await registerUser("search");
      await createListing(searchSeller.token, {
        title: "Linear Algebra Notes",
        description: "Handwritten notes for MATH 221",
        price: "10.00",
        category: "BOOKS",
        condition: "GOOD",
      });
      await createListing(searchSeller.token, {
        title: "Desk Fan",
        description: "Quiet fan for hot lecture halls",
        price: "18.00",
        category: "FURNITURE",
        condition: "FAIR",
      });
      await createListing(searchSeller.token, {
        title: "Graphing Calculator",
        description: "Required for engineering courses",
        price: "45.00",
        category: "ELECTRONICS",
        condition: "NEW",
      });
    });

    it("finds listings by title, case-insensitively", async () => {
      const res = await request.get("/api/listings?search=ALGEBRA");
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].title, "Linear Algebra Notes");
    });

    it("matches the description as well as the title", async () => {
      const res = await request.get("/api/listings?search=lecture");
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].title, "Desk Fan");
    });

    it("returns an empty result set for a term with no matches", async () => {
      const res = await request.get("/api/listings?search=zzzznotfound");
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data, []);
      assert.equal(res.body.pagination.total, 0);
    });

    it("filters by category and condition", async () => {
      const byCategory = await request.get("/api/listings?category=ELECTRONICS");
      assert.ok(byCategory.body.data.every((l) => l.category === "ELECTRONICS"));
      assert.ok(byCategory.body.data.some((l) => l.title === "Graphing Calculator"));

      const byCondition = await request.get("/api/listings?condition=FAIR");
      assert.equal(byCondition.body.data.length, 1);
      assert.equal(byCondition.body.data[0].title, "Desk Fan");
    });

    it("filters by price range", async () => {
      const res = await request.get("/api/listings?minPrice=15&maxPrice=30");
      assert.equal(res.status, 200);
      const titles = res.body.data.map((l) => l.title);
      assert.ok(titles.includes("Desk Fan"));
      assert.ok(!titles.includes("Graphing Calculator"));
      assert.ok(!titles.includes("Linear Algebra Notes"));
    });

    it("rejects invalid filter values", async () => {
      const res = await request.get("/api/listings?category=ROCKETS&minPrice=-1");
      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
    });

    it("paginates results", async () => {
      const page1 = await request.get("/api/listings?search=&limit=2&page=1");
      const page2 = await request.get("/api/listings?search=&limit=2&page=2");

      assert.equal(page1.body.data.length, 2);
      assert.ok(page2.body.data.length >= 1);
      assert.equal(page1.body.pagination.limit, 2);
      assert.ok(page1.body.pagination.totalPages >= 2);

      const ids = [...page1.body.data, ...page2.body.data].map((l) => l.id);
      assert.equal(new Set(ids).size, ids.length, "pages must not overlap");
    });
  });
});
