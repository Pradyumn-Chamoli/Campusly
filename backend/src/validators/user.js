import { param, body } from "express-validator";

export const userIdValidation = [
  param("id").isInt({ min: 1 }).withMessage("Invalid user id"),
];

// `values: "falsy"` lets an empty string mean "clear this field", which the
// controller then stores as null. Empty strings are still rejected for `name`
// because it must never be blank.
export const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Must be between 1 and 100 characters"),
  body("bio")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Bio must be text")
    .isLength({ max: 500 })
    .withMessage("Bio must be 500 characters or less"),
  body("avatarUrl")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Avatar must be a URL")
    .isURL()
    .withMessage("Must be a valid image URL"),
];
