import { validationResult } from "express-validator";

export default function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const details = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      error: "Validation failed",
      details,
    });
  }

  next();
}
