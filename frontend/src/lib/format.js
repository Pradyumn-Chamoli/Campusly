// Shared display helpers. Campusly prices are shown in INR (DIT University,
// Delhi) with the symbol only when the amount has no decimals.

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthYearFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return priceFormatter.format(amount);
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}

export function formatMonthYear(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : monthYearFormatter.format(date);
}

export function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date);
}

export const CONDITION_LABELS = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export const CATEGORY_LABELS = {
  BOOKS: "Books",
  ELECTRONICS: "Electronics",
  FURNITURE: "Furniture",
  CLOTHING: "Clothing",
  STATIONERY: "Stationery",
  SPORTS: "Sports",
  OTHER: "Other",
};

export const CATEGORY_EMOJI = {
  BOOKS: "📚",
  ELECTRONICS: "💻",
  FURNITURE: "🪑",
  CLOTHING: "👕",
  STATIONERY: "✏️",
  SPORTS: "⚽",
  OTHER: "📦",
};

export const STATUS_LABELS = {
  ACTIVE: "Active",
  SOLD: "Sold",
  REMOVED: "Removed",
};

export const REQUEST_STATUS_LABELS = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export const REPORT_REASON_LABELS = {
  SPAM: "Spam",
  INAPPROPRIATE: "Inappropriate content",
  PROHIBITED: "Prohibited item",
  MISLEADING: "Misleading listing",
  OTHER: "Something else",
};

export const REPORT_STATUS_LABELS = {
  PENDING: "Pending",
  DISMISSED: "Dismissed",
  REMOVED: "Listing removed",
};
