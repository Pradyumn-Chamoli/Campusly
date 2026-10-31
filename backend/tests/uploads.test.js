// Phase 13 — Image uploads: validation, storage limits, ownership
// (docs/05 §6 "File uploads", docs/02 §12 "Secure file uploads").
import "./setup-env.js";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { storageMode, UPLOADS_DIR } from "../src/config/storage.js";
import {
  request,
  resetDb,
  registerUser,
  createListing,
  authHeader,
  prisma,
  PNG_1x1,
} from "./helpers.js";

const isLocal = storageMode === "local";

function listStoredFiles() {
  if (!isLocal) return [];
  return fs.readdirSync(UPLOADS_DIR);
}

function uploadImage(listingId, token, file = PNG_1x1, type = "image/png") {
  return request
    .post(`/api/listings/${listingId}/images`)
    .set(authHeader(token))
    // superagent needs an explicit filename for Buffer parts.
    .attach("images", file, { filename: "image.png", contentType: type });
}

function imageCount(listingId) {
  return prisma.listingImage.count({ where: { listingId } });
}

describe("listing image uploads", () => {
  let owner;
  let stranger;
  let listing;

  before(async () => {
    await resetDb();
    owner = await registerUser("upload-owner");
    stranger = await registerUser("upload-stranger");
    listing = await createListing(owner.token, { title: "Photo Item" });
  });

  it("stores a valid image and returns its record", async (t) => {
    if (!isLocal) {
      t.skip("Cloudinary storage is configured; local file checks skipped");
      return;
    }

    const beforeFiles = listStoredFiles();
    const res = await uploadImage(listing.id, owner.token);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.length, 1);
    assert.match(res.body.data[0].url, /^\/uploads\/.+\.png$/);

    const afterFiles = listStoredFiles();
    assert.equal(afterFiles.length, beforeFiles.length + 1, "one file should be stored");

    const detail = await request.get(`/api/listings/${listing.id}`);
    assert.equal(detail.body.data.images.length, 1);
  });

  it("rejects a file that is not an allowed image type", async () => {
    const before = await imageCount(listing.id);

    const res = await uploadImage(
      listing.id,
      owner.token,
      Buffer.from("<html>hi</html>"),
      "text/html"
    );

    assert.equal(res.status, 400);
    assert.match(res.body.error, /only jpeg, png or webp/i);
    assert.equal(await imageCount(listing.id), before, "no image row may be created");
  });

  it("rejects an upload to a listing the user does not own, without keeping files", async () => {
    const beforeFiles = listStoredFiles();
    const beforeCount = await imageCount(listing.id);

    const res = await uploadImage(listing.id, stranger.token);

    assert.equal(res.status, 403);
    assert.deepEqual(listStoredFiles(), beforeFiles, "rejected upload must not leave files behind");
    assert.equal(await imageCount(listing.id), beforeCount);
  });

  it("rejects more than 5 files in one upload", async () => {
    const beforeCount = await imageCount(listing.id);
    const req = request
      .post(`/api/listings/${listing.id}/images`)
      .set(authHeader(owner.token));

    for (let i = 0; i < 6; i += 1) {
      req.attach("images", PNG_1x1, { filename: `image-${i}.png`, contentType: "image/png" });
    }

    const res = await req;
    assert.equal(res.status, 400);
    assert.match(res.body.error, /up to 5 images/i);
    assert.equal(await imageCount(listing.id), beforeCount);
  });

  it("caps a listing at 10 images in total", async () => {
    const before = await imageCount(listing.id);
    const added = [];

    // Fill the listing up to the cap directly; uploading 9 real files would
    // only retest the multer limits.
    for (let i = before; i < 10; i += 1) {
      const row = await prisma.listingImage.create({
        data: {
          listingId: listing.id,
          cloudinaryPublicId: `filler-${i}.png`,
          url: `/uploads/filler-${i}.png`,
          position: i,
        },
      });
      added.push(row.id);
    }

    try {
      const res = await uploadImage(listing.id, owner.token);
      assert.equal(res.status, 400);
      assert.match(res.body.error, /up to 10 images/i);
      assert.equal(await imageCount(listing.id), 10);
    } finally {
      await prisma.listingImage.deleteMany({ where: { id: { in: added } } });
    }
  });

  it("lets only the owner delete an image", async () => {
    const uploaded = await uploadImage(listing.id, owner.token);
    assert.equal(uploaded.status, 201);
    const imageId = uploaded.body.data[0].id;

    const denied = await request
      .delete(`/api/listings/${listing.id}/images/${imageId}`)
      .set(authHeader(stranger.token));
    assert.equal(denied.status, 403);
    assert.ok(await prisma.listingImage.findUnique({ where: { id: imageId } }));

    const allowed = await request
      .delete(`/api/listings/${listing.id}/images/${imageId}`)
      .set(authHeader(owner.token));
    assert.equal(allowed.status, 204);
    assert.equal(await prisma.listingImage.findUnique({ where: { id: imageId } }), null);
  });

  it("serves local uploads as images with nosniff protection", async (t) => {
    if (!isLocal) {
      t.skip("Cloudinary storage is configured; local serving skipped");
      return;
    }

    const uploaded = await uploadImage(listing.id, owner.token);
    assert.equal(uploaded.status, 201);
    const url = uploaded.body.data[0].url; // e.g. /uploads/listing-...png

    const file = await request.get(url);
    assert.equal(file.status, 200);
    assert.match(file.headers["content-type"], /image\/png/);
    assert.equal(file.headers["x-content-type-options"], "nosniff");
  });
});
