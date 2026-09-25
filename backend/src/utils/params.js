// Express 5 exposes `req.query` through a read-only getter, so express-validator
// cannot write sanitized values back to it. Validation still rejects bad input,
// but these helpers normalise the types before they reach Prisma.

export function toInt(value, fallback = undefined) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function toFloat(value, fallback = undefined) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
