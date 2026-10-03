import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import config from "./index.js";

// Listing images live on Cloudinary (docs/01_PRD.md §10, docs/03 §Image Storage).
// When credentials are missing — typical for a fresh local checkout — the API
// falls back to writing files to ./uploads so image handling stays testable
// without an external account. The storage mode is reported in /api/health.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_IMAGES_PER_UPLOAD = 5;

const { cloudName, apiKey, apiSecret } = config.cloudinary;
export const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);
export const storageMode = isCloudinaryConfigured ? "cloudinary" : "local";

if (isCloudinaryConfigured) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
} else {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function localStorage() {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      // Extension comes from the validated MIME type, never from the
      // client-supplied name: a `.html` name with an image MIME type would
      // otherwise be stored and later served as HTML from this origin.
      const ext = MIME_EXTENSIONS[file.mimetype] ?? ".bin";
      cb(null, `listing-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
}

function cloudinaryStorage() {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "campusly/listings",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 1600, height: 1600, crop: "limit" }],
    },
  });
}

function invalidTypeError() {
  const error = new Error("Only JPEG, PNG or WebP images are allowed");
  error.status = 400;
  return error;
}

function fileFilter(req, file, cb) {
  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    return cb(invalidTypeError());
  }
  cb(null, true);
}

export const upload = multer({
  storage: isCloudinaryConfigured ? cloudinaryStorage() : localStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: MAX_IMAGES_PER_UPLOAD },
  fileFilter,
});

// Turns whatever the storage engine produced into the fields we persist.
export function toImageRecord(file) {
  if (isCloudinaryConfigured) {
    return {
      cloudinaryPublicId: file.filename, // CloudinaryStorage puts public_id here
      url: file.path,
      altText: null,
    };
  }

  return {
    cloudinaryPublicId: file.filename,
    url: `/uploads/${file.filename}`,
    altText: null,
  };
}

// Returns true when the image was actually removed.
export async function removeImage(publicId) {
  if (!publicId) return false;

  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result?.result === "ok" || result?.result === "not found";
    } catch {
      return false;
    }
  }

  const safeName = path.basename(publicId);
  const filePath = path.join(UPLOADS_DIR, safeName);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export { MAX_IMAGES_PER_UPLOAD, MAX_IMAGE_SIZE, UPLOADS_DIR };
