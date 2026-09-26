import { body, param, query } from "express-validator";

// Sanitizers are intentionally omitted: Express 5 exposes `req.query` through
// a read-only getter, so express-validator cannot write values back. The
// controller normalises types instead.

export const addFavoriteValidation = [
  body("listingId")
    .notEmpty()
    .withMessage("listingId is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Invalid listing id"),
];

export const favoriteListingIdValidation = [
  param("listingId").isInt({ min: 1 }).withMessage("Invalid listing id"),
];

export const favoriteQueryValidation = [
  query("page")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Page must be 1 or greater"),
  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];
