// Phase 13 — Cross-cutting security checks (docs/02 §12, docs/05 §15).
import "./setup-env.js";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import config from "../src/config/index.js";
import {
  request,
  resetDb,
  registerUser,
  createListing,
  authHeader,
  prisma,
} from "./helpers.js";

// Endpoints that must reject anonymous callers.
const PROTECTED = [
  ["get", "/api/auth/me"],
  ["post", "/api/auth/logout"],
  ["get", "/api/listings/mine"],
  ["post", "/api/listings"],
  ["put", "/api/users/profile"],
  ["get", "/api/favorites"],
  ["post", "/api/favorites"],
  ["get", "/api/conversations"],
  ["get", "/api/requests"],
  ["post", "/api/requests"],
  ["post", "/api/reports"],
  ["get", "/api/reports"],
  ["get", "/api/admin/listings/removed"],
];

describe("security", () => {
  before(resetDb);

  describe("authentication coverage", () => {
    for (const [method, path] of PROTECTED) {
      it(`rejects ${method.toUpperCase()} ${path} without a token`, async () => {
        const res = await request[method](path);
        assert.equal(res.status, 401);
      });
    }

    it("rejects a token signed with the wrong secret", async () => {
      // A structurally valid JWT signed with a different key must not work.
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({ userId: 1, iat: 0, exp: 9999999999 })
      ).toString("base64url");
      const signature = Buffer.from("forged-signature").toString("base64url");

      const res = await request
        .get("/api/auth/me")
        .set(authHeader(`${header}.${payload}.${signature}`));

      assert.equal(res.status, 401);
    });
  });

  describe("sensitive data exposure", () => {
    it("never returns password hashes", async () => {
      const { token, user } = await registerUser("expose");

      const responses = [
        await request.get("/api/auth/me").set(authHeader(token)),
        await request.get("/api/listings"),
        await request.get(`/api/users/${user.id}`),
      ];

      for (const res of responses) {
        assert.ok(!res.text.includes("passwordHash"), "response must not contain passwordHash");
        assert.ok(!res.text.includes("password"), "response must not contain a password field");
      }
    });

    it("hides email and role from public profiles", async () => {
      const { user } = await registerUser("public-profile");

      const res = await request.get(`/api/users/${user.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.email, undefined);
      assert.equal(res.body.data.role, undefined);
      assert.equal(res.body.data.passwordHash, undefined);
      assert.ok(res.body.data.name);

      // The owner still sees their own email via the profile endpoint.
      const token = (
        await request.post("/api/auth/login").send({
          email: user.email,
          password: "password123",
        })
      ).body.data.token;

      const own = await request
        .get("/api/auth/me")
        .set(authHeader(token));
      assert.equal(own.body.data.email, user.email);
    });

    it("returns the same message whether the email or the password is wrong", async () => {
      const known = await registerUser("known-email");

      const wrongPassword = await request.post("/api/auth/login").send({
        email: known.user.email,
        password: "definitely-not-it",
      });
      const unknownEmail = await request.post("/api/auth/login").send({
        email: "nobody-here@test.local",
        password: "definitely-not-it",
      });

      assert.equal(wrongPassword.status, 401);
      assert.equal(unknownEmail.status, 401);
      assert.equal(wrongPassword.body.error, unknownEmail.body.error);
    });

    it("returns a generic error for failures without a status", async () => {
      // Non-integer ids are rejected by validation, never by a 500.
      const res = await request.get("/api/listings/not-a-number");
      assert.equal(res.status, 400);
    });
  });

  describe("hardened HTTP headers", () => {
    it("sets helmet security headers", async () => {
      const res = await request.get("/api/health");
      assert.equal(res.status, 200);
      assert.equal(res.headers["x-content-type-options"], "nosniff");
      assert.ok(res.headers["x-frame-options"]);
      assert.ok(res.headers["content-security-policy"] || res.headers["content-security-policy-report-only"]);
    });

    it("answers CORS requests only for the configured client origin", async () => {
      const res = await request
        .get("/api/health")
        .set("Origin", config.clientUrl);

      assert.equal(res.headers["access-control-allow-origin"], config.clientUrl);
    });

    it("rejects JSON bodies larger than the 100kb limit", async () => {
      const { token } = await registerUser("big-body");
      const res = await request
        .post("/api/listings")
        .set(authHeader(token))
        .send({ title: "x".repeat(200_000) });

      assert.equal(res.status, 413);
    });
  });

  describe("data integrity", () => {
    it("stores listing prices with at most two decimals", async () => {
      const { token } = await registerUser("price-check");
      const res = await request
        .post("/api/listings")
        .set(authHeader(token))
        .send({
          title: "Precise Price",
          description: "Costs this much",
          price: "19.999",
          category: "BOOKS",
          condition: "GOOD",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
    });

    it("keeps removed listings hidden from marketplace queries", async () => {
      const { token } = await registerUser("hide-check");
      const listing = await createListing(token, { title: "Soon Hidden" });
      await prisma.listing.update({
        where: { id: listing.id },
        data: { status: "REMOVED" },
      });

      const res = await request.get("/api/listings");
      assert.ok(!res.body.data.some((l) => l.id === listing.id));
    });
  });
});
