import { body, param, query } from "express-validator";

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

export const paginationValidation = [
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

export const listingIdValidation = [
  param("id").isInt({ min: 1 }).withMessage("Invalid listing id"),
];

const priceValidation = body("price")
  .trim()
  .notEmpty()
  .withMessage("Price is required")
  .bail()
  .isFloat({ min: 0.01, max: 99999999.99 })
  .withMessage("Price must be a positive amount")
  .bail()
  .custom((value) => /^\d+(\.\d{1,2})?$/.test(String(value)))
  .withMessage("Price can have at most 2 decimal places");

export const createListingValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .bail()
    .isLength({ min: 1, max: 150 })
    .withMessage("Must be between 1 and 150 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .bail()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Must be between 1 and 2000 characters"),
  priceValidation,
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .bail()
    .isIn(LISTING_CATEGORIES)
    .withMessage("Invalid category"),
  body("condition")
    .notEmpty()
    .withMessage("Condition is required")
    .bail()
    .isIn(LISTING_CONDITIONS)
    .withMessage("Invalid condition"),
];

// Every field is optional for updates. An empty body is rejected in the
// controller, not by validation.
export const updateListingValidation = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage("Must be between 1 and 150 characters")
    .notEmpty()
    .withMessage("Title is required"),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Must be between 1 and 2000 characters")
    .notEmpty()
    .withMessage("Description is required"),
  body("price")
    .optional()
    .custom((value) => /^\d+(\.\d{1,2})?$/.test(String(value)))
    .withMessage("Price can have at most 2 decimal places")
    .bail()
    .isFloat({ min: 0.01, max: 99999999.99 })
    .withMessage("Price must be a positive amount"),
  body("category")
    .optional()
    .isIn(LISTING_CATEGORIES)
    .withMessage("Invalid category"),
  body("condition")
    .optional()
    .isIn(LISTING_CONDITIONS)
    .withMessage("Invalid condition"),
];
