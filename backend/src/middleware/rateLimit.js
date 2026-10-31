import { rateLimit } from "express-rate-limit";

// Tests issue many requests from one process in a few seconds, so the
// production limits would reject legitimate traffic. Limits are only raised
// under NODE_ENV=test; everything else uses the real values.
const isTest = process.env.NODE_ENV === "test";

// Shared response shape so clients can surface the message like any other API
// error ({ error: "..." }).
function limitHandler(message) {
  return (req, res) => {
    res.status(429).json({ error: message });
  };
}

// Brute-force protection for credential endpoints (docs/02 §12 "Rate limiting
// where appropriate"). Deliberately strict: normal users rarely retry login.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 100000 : 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: limitHandler("Too many attempts, please try again in 15 minutes"),
});

// Broad safety net for the rest of the API. Generous enough that normal
// browsing never hits it, but it stops scripted flooding.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 100000 : 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: limitHandler("Too many requests, please try again later"),
});
