import { body, param, query } from "express-validator";

// Sanitizers are intentionally omitted: Express 5 exposes `req.query` through
// a read-only getter, so express-validator cannot write values back. The
// controller normalises types instead.

export const REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
];

// Targets the buyer/seller may move a request to. `PENDING` is an origin
// state only — it is never a valid update target.
const UPDATABLE_STATUSES = ["ACCEPTED", "REJECTED", "CANCELLED", "COMPLETED"];

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

export const createRequestValidation = [
  body("listingId")
    .notEmpty()
    .withMessage("listingId is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Invalid listing id"),
  body("note")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Note must be 500 characters or less"),
];

export const listRequestsValidation = [
  ...paginationValidation,
  query("role")
    .optional({ values: "falsy" })
    .isIn(["buyer", "seller"])
    .withMessage("Role must be buyer or seller"),
  query("status")
    .optional({ values: "falsy" })
    .isIn(REQUEST_STATUSES)
    .withMessage("Invalid status"),
];

export const updateRequestStatusValidation = [
  param("id").isInt({ min: 1 }).withMessage("Invalid request id"),
  body("status")
    .notEmpty()
    .withMessage("status is required")
    .bail()
    .isIn(UPDATABLE_STATUSES)
    .withMessage("Invalid status"),
];
