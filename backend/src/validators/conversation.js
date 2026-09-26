import { body, param, query } from "express-validator";

// Sanitizers are intentionally omitted for query params: Express 5 exposes
// `req.query` through a read-only getter, so express-validator cannot write
// values back. The controller normalises types instead.

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

export const startConversationValidation = [
  body("listingId")
    .notEmpty()
    .withMessage("listingId is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Invalid listing id"),
];

export const listConversationsValidation = paginationValidation;

export const listMessagesValidation = paginationValidation;

export const sendMessageValidation = [
  body("body")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Message must be between 1 and 1000 characters"),
];

export const conversationIdValidation = [
  param("conversationId").isInt({ min: 1 }).withMessage("Invalid conversation id"),
];

export const conversationParamValidation = [
  param("id").isInt({ min: 1 }).withMessage("Invalid conversation id"),
];
