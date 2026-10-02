import { body, param, query } from "express-validator";

// Sanitizers are intentionally omitted: Express 5 exposes `req.query` through
// a read-only getter, so express-validator cannot write values back. The
// controller normalises types instead.

export const REPORT_REASONS = [
  "SPAM",
  "INAPPROPRIATE",
  "PROHIBITED",
  "MISLEADING",
  "OTHER",
];

export const REPORT_STATUSES = ["PENDING", "DISMISSED", "REMOVED"];

// The two moderation actions from docs/02_SRS.md FR-17.
const RESOLVE_ACTIONS = ["DISMISS", "REMOVE"];

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

export const createReportValidation = [
  body("listingId")
    .notEmpty()
    .withMessage("listingId is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Invalid listing id"),
  body("reason")
    .notEmpty()
    .withMessage("reason is required")
    .bail()
    .isIn(REPORT_REASONS)
    .withMessage("Invalid reason"),
  body("description")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must be 1000 characters or less"),
];

export const listReportsValidation = [
  ...paginationValidation,
  query("status")
    .optional({ values: "falsy" })
    .isIn(REPORT_STATUSES)
    .withMessage("Invalid status"),
];

export const resolveReportValidation = [
  param("id").isInt({ min: 1 }).withMessage("Invalid report id"),
  body("action")
    .notEmpty()
    .withMessage("action is required")
    .bail()
    .isIn(RESOLVE_ACTIONS)
    .withMessage("Action must be DISMISS or REMOVE"),
];
