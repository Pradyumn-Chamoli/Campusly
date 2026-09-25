import multer from "multer";

export default function errorHandler(err, req, res, _next) {
  // Multer failures (file too large, too many files) are client errors.
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: "Each image must be 5MB or smaller",
      LIMIT_FILE_COUNT: "You can upload up to 5 images at once",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field",
      LIMIT_FILE_COUNT_EXCEEDED: "You can upload up to 5 images at once",
    };

    return res.status(400).json({
      error: messages[err.code] ?? "Image upload failed",
    });
  }

  console.error(err.stack);

  const status = err.status || 500;
  const message = err.status ? err.message : "Internal server error";

  res.status(status).json({ error: message });
}
