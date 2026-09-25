import { query } from "express-validator";

// Note: sanitizers such as `.toInt()` are intentionally omitted. In Express 5
// `req.query` is a read-only getter, so sanitized values are never written
// back. Validation still runs here; the controllers normalise types instead.

export const LISTING_CATEGORIES = [
  "BOOKS",
  "ELECTRONICS",
  "FURNITURE",
  "CLOTHING",
  "STATIONERY",
  "SPORTS",
  "OTHER",
];

export const LISTING_CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"];

export const LISTING_STATUSES = ["ACTIVE", "SOLD", "REMOVED"];

const paginationValidation = [
  query("page")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Page must be 1 or greater"),
  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const listQueryValidation = [
  ...paginationValidation,
  query("search")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search must be 100 characters or less"),
  query("category")
    .optional({ values: "falsy" })
    .isIn(LISTING_CATEGORIES)
    .withMessage("Invalid category"),
  query("condition")
    .optional({ values: "falsy" })
    .isIn(LISTING_CONDITIONS)
    .withMessage("Invalid condition"),
  query("minPrice")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be 0 or greater"),
  query("maxPrice")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be 0 or greater"),
  query("sellerId")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Invalid seller"),
];

export const myListingsQueryValidation = [
  ...paginationValidation,
  query("status")
    .optional({ values: "falsy" })
    .isIn(LISTING_STATUSES)
    .withMessage("Invalid status"),
];
