// Phase 13 — Authentication (docs/05 §8, docs/02 FR-01..FR-04).
import "./setup-env.js";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { request, resetDb, registerUser, uniqueEmail, authHeader, prisma } from "./helpers.js";

describe("authentication", () => {
  before(resetDb);

  describe("registration", () => {
    it("creates an account and returns a sanitized user", async () => {
      const email = uniqueEmail("register");
      const res = await request.post("/api/auth/register").send({
        email,
        password: "supersecret1",
        name: "New Student",
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.email, email);
      assert.equal(res.body.data.role, "STUDENT");
      assert.equal(res.body.data.passwordHash, undefined);
      assert.equal(res.body.data.password, undefined);
    });

    it("rejects a duplicate email", async () => {
      const email = uniqueEmail("dup");
      const payload = { email, password: "supersecret1", name: "Duplicate" };

      assert.equal((await request.post("/api/auth/register").send(payload)).status, 201);
      const second = await request.post("/api/auth/register").send(payload);

      assert.equal(second.status, 409);
      assert.match(second.body.error, /already registered/i);
    });

    it("rejects an invalid email", async () => {
      const res = await request.post("/api/auth/register").send({
        email: "not-an-email",
        password: "supersecret1",
        name: "Bad Email",
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
      assert.ok(res.body.details.some((d) => d.field === "email"));
    });

    it("rejects a password shorter than 8 characters", async () => {
      const res = await request.post("/api/auth/register").send({
        email: uniqueEmail("short"),
        password: "short1",
        name: "Short Password",
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.details.some((d) => d.field === "password"));
    });

    it("rejects a missing name", async () => {
      const res = await request.post("/api/auth/register").send({
        email: uniqueEmail("noname"),
        password: "supersecret1",
        name: "   ",
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.details.some((d) => d.field === "name"));
    });

    it("never stores the password in plain text", async () => {
      const email = uniqueEmail("hashed");
      await request.post("/api/auth/register").send({
        email,
        password: "supersecret1",
        name: "Hash Check",
      });

      const user = await prisma.user.findUnique({ where: { email } });
      assert.ok(user);
      assert.notEqual(user.passwordHash, "supersecret1");
      assert.match(user.passwordHash, /^\$2/); // bcrypt prefix
    });
  });

  describe("login", () => {
    it("returns a token for valid credentials", async () => {
      const { token, user } = await registerUser("login-ok");

      assert.ok(token);
      assert.equal(user.passwordHash, undefined);
    });

    it("rejects a wrong password", async () => {
      const email = uniqueEmail("wrong-pass");
      await registerUser("wrong-pass", { email });

      const res = await request
        .post("/api/auth/login")
        .send({ email, password: "not-the-password" });

      assert.equal(res.status, 401);
      assert.match(res.body.error, /invalid email or password/i);
    });

    it("rejects an unknown email with the same message", async () => {
      const res = await request
        .post("/api/auth/login")
        .send({ email: uniqueEmail("ghost"), password: "supersecret1" });

      assert.equal(res.status, 401);
      assert.match(res.body.error, /invalid email or password/i);
    });
  });

  describe("session", () => {
    it("returns the current user for a valid token", async () => {
      const { token, user } = await registerUser("me");

      const res = await request.get("/api/auth/me").set(authHeader(token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, user.id);
      assert.equal(res.body.data.email, user.email);
    });

    it("rejects a request without a token", async () => {
      const res = await request.get("/api/auth/me");
      assert.equal(res.status, 401);
    });

    it("rejects a forged token", async () => {
      const res = await request
        .get("/api/auth/me")
        .set(authHeader("not.a.real.jwt"));

      assert.equal(res.status, 401);
    });

    it("logs out successfully", async () => {
      const { token } = await registerUser("logout");

      const res = await request.post("/api/auth/logout").set(authHeader(token));
      assert.equal(res.status, 200);
    });
  });
});
