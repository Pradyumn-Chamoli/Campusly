import prisma from "../config/prisma.js";
import { removeImage, toImageRecord } from "../config/storage.js";
import { toInt } from "../utils/params.js";

// Documents cap the per-upload request at 1–5 files; a listing keeps up to 10
// photos in total so a single seller cannot hoard storage.
const MAX_IMAGES_PER_LISTING = 10;
const MAX_ALT_TEXT = 200;

// Returns either the cleaned value or an error message, per docs/07 §6.
function readAltText(value) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }
  if (typeof value !== "string" || value.trim().length > MAX_ALT_TEXT) {
    return { error: `Alt text must be ${MAX_ALT_TEXT} characters or less` };
  }
  return { value: value.trim() || null };
}

async function findOwnedListing(req, res) {
  const listingId = toInt(req.params.listingId);
  if (listingId === undefined) {
    res.status(400).json({ error: "Invalid listing id" });
    return null;
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true },
  });

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return null;
  }

  if (listing.sellerId !== req.user.id) {
    res.status(403).json({ error: "You can only manage your own listings" });
    return null;
  }

  return listing;
}

async function removeStoredFiles(files) {
  for (const file of files) {
    await removeImage(toImageRecord(file).cloudinaryPublicId);
  }
}

export async function addListingImages(req, res, next) {
  const files = req.files ?? [];
  let persisted = false;

  try {
    const listing = await findOwnedListing(req, res);
    if (!listing) {
      await removeStoredFiles(files);
      return;
    }

    if (files.length === 0) {
      return res.status(400).json({ error: "Select at least one image" });
    }

    const altText = readAltText(req.body.altText);
    if (altText.error) {
      await removeStoredFiles(files);
      return res.status(400).json({ error: altText.error });
    }

    const [existingCount, highest] = await Promise.all([
      prisma.listingImage.count({ where: { listingId: listing.id } }),
      prisma.listingImage.aggregate({
        where: { listingId: listing.id },
        _max: { position: true },
      }),
    ]);

    if (existingCount + files.length > MAX_IMAGES_PER_LISTING) {
      await removeStoredFiles(files);
      return res.status(400).json({
        error: `A listing can have up to ${MAX_IMAGES_PER_LISTING} images`,
      });
    }

    const nextPosition = (highest._max.position ?? -1) + 1;

    const records = files.map((file, index) => ({
      ...toImageRecord(file),
      listingId: listing.id,
      altText: altText.value,
      position: nextPosition + index,
    }));

    // All rows are written together, so a failure never commits half an upload.
    const created = await prisma.$transaction(
      records.map((record) => prisma.listingImage.create({ data: record }))
    );
    persisted = true;

    return res.status(201).json({
      message: "Images uploaded",
      data: created.map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.altText,
        position: image.position,
      })),
    });
  } catch (error) {
    // Keep the storage clean when the database write did not commit.
    if (!persisted) {
      await removeStoredFiles(files);
    }
    next(error);
  }
}

export async function deleteListingImage(req, res, next) {
  try {
    const listing = await findOwnedListing(req, res);
    if (!listing) return;

    const imageId = toInt(req.params.imageId);
    if (imageId === undefined) {
      return res.status(400).json({ error: "Invalid image id" });
    }

    const image = await prisma.listingImage.findFirst({
      where: { id: imageId, listingId: listing.id },
      select: { id: true, cloudinaryPublicId: true },
    });

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    await removeImage(image.cloudinaryPublicId);
    await prisma.listingImage.delete({ where: { id: image.id } });

    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}
